import type {
  ApplicationAnswer,
  ApplicationAnswerVersion,
} from "./application-answer-repository";
import { getApplicationAirlineContext } from "./application-answer-repository";
import type {
  AnswerQualityDimension,
  AnswerQualityFinding,
} from "./answer-quality-rubric";
import { getPracticeQuestionsForAirline } from "./airline-knowledge-repository";
import {
  interviewQuestions,
  type InterviewPracticeSourceContext,
  type InterviewCategory,
  type InterviewQuestion,
} from "./interview-practice-data";
import { isAllowedInterviewQuestion } from "./interview-practice-queue";

export type ApplicationDrillWeakness =
  | "weak_airline_connection"
  | "weak_specificity"
  | "weak_evidence"
  | "weak_structure"
  | "weak_relevance"
  | "missing_action"
  | "missing_result";

export type ApplicationInterviewDrillCandidate = {
  questionId: string;
  question: InterviewQuestion;
  weakness: ApplicationDrillWeakness;
  weaknessReason: string;
  applicationAnswerId: string;
  applicationVersionId: string;
  targetAirlineId?: string;
  selectedExperienceId?: string;
  recommendationExplanation: string;
  priority: "primary" | "secondary";
};

export type ApplicationDrillSelectionInput = {
  answer: ApplicationAnswer;
  version?: ApplicationAnswerVersion;
  recentQuestionIds?: string[];
  openQuestionIds?: string[];
  questions?: InterviewQuestion[];
  airlineQuestions?: InterviewQuestion[];
};

const negative = new Set(["needs_improvement", "insufficient_evidence"]);
const weaknessByDimension: Partial<
  Record<AnswerQualityDimension, ApplicationDrillWeakness>
> = {
  airlineFit: "weak_airline_connection",
  specificity: "weak_specificity",
  evidence: "weak_evidence",
  structure: "weak_structure",
  relevance: "weak_relevance",
  action: "missing_action",
  result: "missing_result",
};
const weaknessPriority: ApplicationDrillWeakness[] = [
  "weak_relevance",
  "weak_airline_connection",
  "weak_specificity",
  "weak_evidence",
  "missing_action",
  "missing_result",
  "weak_structure",
];

function categoryFor(
  weakness: ApplicationDrillWeakness,
  answer: ApplicationAnswer,
): InterviewCategory {
  if (weakness === "weak_airline_connection")
    return "introduction_and_motivation";
  if (
    weakness === "weak_specificity" ||
    weakness === "weak_evidence" ||
    weakness === "missing_action" ||
    weakness === "missing_result"
  )
    return "behavioral_experience";
  const prompt = `${answer.promptId} ${answer.title}`.toLowerCase();
  if (/safety|안전/.test(prompt)) return "safety_and_role_judgment";
  if (/customer|service|고객|서비스/.test(prompt)) return "customer_situation";
  if (/motivation|strength|지원|동기|강점/.test(prompt))
    return "introduction_and_motivation";
  return "behavioral_experience";
}

function explanation(
  weakness: ApplicationDrillWeakness,
  feedback: string,
): string {
  const lead: Record<ApplicationDrillWeakness, string> = {
    weak_airline_connection:
      "현재 지원서 답변에서 항공사와 연결되는 직접 근거를 더 확인할 수 있도록",
    weak_specificity:
      "현재 지원서 답변의 상황과 행동을 더 구체적으로 확장할 수 있도록",
    weak_evidence: "현재 지원서 답변의 주장을 실제 경험으로 뒷받침할 수 있도록",
    weak_structure: "현재 지원서 답변의 결론과 근거 흐름을 정리할 수 있도록",
    weak_relevance: "현재 지원서 답변에서 문항의 핵심에 먼저 답하는 연습을 위해",
    missing_action: "현재 지원서 분석에서 직접 수행한 행동을 보완할 수 있도록",
    missing_result: "현재 지원서 분석에서 결과와 배움을 보완할 수 있도록",
  };
  return `${lead[weakness]} 이 면접 질문을 추천합니다. ${feedback}`.trim();
}

export function applicationFindingWeakness(
  finding: AnswerQualityFinding,
): ApplicationDrillWeakness | null {
  if (finding.status === "not_applicable" || !negative.has(finding.status))
    return null;
  return weaknessByDimension[finding.dimension] ?? null;
}

export function applicationDrillSourceContext(
  candidate: ApplicationInterviewDrillCandidate,
): InterviewPracticeSourceContext {
  return {
    source: "application_drill",
    applicationAnswerId: candidate.applicationAnswerId,
    applicationVersionId: candidate.applicationVersionId,
    weakness: candidate.weakness,
  };
}

export function selectApplicationInterviewDrills({
  answer,
  version,
  recentQuestionIds = [],
  openQuestionIds = [],
  questions = interviewQuestions,
  airlineQuestions,
}: ApplicationDrillSelectionInput): ApplicationInterviewDrillCandidate[] {
  if (
    !version?.analysis?.rubric?.evaluated ||
    version.id !== answer.currentVersionId
  )
    return [];
  const findings = version.analysis.rubric.findings
    .map((finding) => ({ finding, weakness: applicationFindingWeakness(finding) }))
    .filter(
      (item): item is {
        finding: AnswerQualityFinding;
        weakness: ApplicationDrillWeakness;
      } => Boolean(item.weakness),
    )
    .sort(
      (a, b) =>
        weaknessPriority.indexOf(a.weakness) -
        weaknessPriority.indexOf(b.weakness),
    );
  if (!findings.length) return [];

  const hasPublishedAirlineContext = Boolean(
    answer.airlineId && getApplicationAirlineContext(answer.airlineId),
  );
  const publishedAirlineQuestions = hasPublishedAirlineContext
    ? (airlineQuestions ??
        getPracticeQuestionsForAirline({
          airlineId: answer.airlineId,
          includeGeneralQuestions: false,
        })).filter((question) =>
        isAllowedInterviewQuestion(question, answer.airlineId),
      )
    : [];
  const validGeneral = questions.filter(
    (question) =>
      !question.airlineTags?.length && isAllowedInterviewQuestion(question),
  );
  const recent = new Set(recentQuestionIds);
  const open = new Set(openQuestionIds);
  const selected = new Set<string>();
  const candidates: ApplicationInterviewDrillCandidate[] = [];

  for (const { finding, weakness } of findings) {
    const category = categoryFor(weakness, answer);
    const preferred =
      weakness === "weak_airline_connection" && publishedAirlineQuestions.length
        ? publishedAirlineQuestions
        : validGeneral;
    const pool = [...preferred, ...validGeneral, ...publishedAirlineQuestions].filter(
      (question, index, rows) =>
        question.category === category &&
        rows.findIndex((item) => item.id === question.id) === index &&
        !selected.has(question.id),
    );
    const question =
      pool.find((item) => !recent.has(item.id) && !open.has(item.id)) ??
      pool.find((item) => !open.has(item.id)) ??
      pool[0];
    if (!question) continue;
    selected.add(question.id);
    candidates.push({
      questionId: question.id,
      question,
      weakness,
      weaknessReason: finding.feedback,
      applicationAnswerId: answer.id,
      applicationVersionId: version.id,
      targetAirlineId: hasPublishedAirlineContext ? answer.airlineId : undefined,
      selectedExperienceId: answer.selectedExperienceIds[0],
      recommendationExplanation: explanation(weakness, finding.feedback),
      priority: candidates.length ? "secondary" : "primary",
    });
    if (candidates.length === 3) break;
  }
  return candidates;
}
