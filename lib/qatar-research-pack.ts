import type {
  AirlineFAQ,
  AirlineKnowledgeProfile,
} from "./airline-knowledge-repository";
import type { AirlineResearchRecord } from "./airline-research-repository";
import type {
  AirlineCoachingInsight,
  AirlineInterviewQuestion,
} from "./airline-knowledge-transformer";

const careers = "https://careers.qatarairways.com/";
const searchJobs = "https://careers.qatarairways.com/global/SearchJobs";
const cabinCrew =
  "https://www.qatarairways.com/en/careers/customer-experience/cabin-crew-recruitment.html";
const pressRelease =
  "https://www.qatarairways.com/press-releases/en-WW/226101-qatar-airways-to-recruit-over-3-000-cabin-crew-globally/";
const collectedAt = "2026-07-27T00:00:00.000Z";

const fact = (
  category: AirlineResearchRecord["extractedFacts"][number]["category"],
  key: string,
  value: string,
  sourceUrl: string,
  sourceGrade: "A" | "B" | "C" | "E" = "A",
) => ({
  category,
  key,
  value,
  sourceUrl,
  sourceGrade,
  verified: sourceGrade !== "E",
});

/** Transcribed only from the supplied Qatar Airways research pack. A/B/C facts are review-approved but remain unpublished. */
export const qatarResearchRecords: AirlineResearchRecord[] = [
  {
    id: "qatar-profile-20260727",
    airlineId: "qatar_airways",
    sourceTitle:
      "Qatar Airways cabin crew recruitment and global recruitment release",
    sourceUrl: cabinCrew,
    sourceType: "Company Profile",
    collectedBy: "manual",
    collectedAt,
    sourceDate: "2026-07-27",
    sourceGrade: "A",
    rawSummary: "Supplied Qatar Profile Data and Source Table.",
    rawText:
      "Qatar Airways; Qatar; Doha; Hamad International Airport; service excellence; multicultural teamwork; customer experience; health and fitness.",
    confidence: "high",
    status: "approved",
    extractedFacts: [
      fact("profile", "official_name", "Qatar Airways", cabinCrew),
      fact("profile", "country", "Qatar / State of Qatar", pressRelease, "A"),
      fact("profile", "headquarters", "Doha, Qatar", cabinCrew),
      fact(
        "profile",
        "hub",
        "Hamad International Airport, Doha",
        pressRelease,
        "A",
      ),
      fact(
        "profile",
        "network",
        "Over 170 destinations worldwide.",
        pressRelease,
        "A",
      ),
      fact(
        "brand",
        "brand_value",
        "Award-winning, global growth, diverse backgrounds.",
        pressRelease,
        "A",
      ),
      fact(
        "service",
        "service_philosophy",
        "Service excellence and multicultural teamwork.",
        cabinCrew,
      ),
      fact(
        "service",
        "customer_experience",
        "Exceptional interpersonal service for customers.",
        cabinCrew,
      ),
      fact(
        "safety",
        "health_fitness",
        "Excellent health and fitness are listed as a requirement.",
        cabinCrew,
      ),
    ],
  },
  {
    id: "qatar-recruitment-20260727",
    airlineId: "qatar_airways",
    sourceTitle: "Qatar Airways Cabin Crew Recruitment",
    sourceUrl: cabinCrew,
    sourceType: "Recruitment Data",
    collectedBy: "manual",
    collectedAt,
    sourceDate: "2026-07-27",
    sourceGrade: "A",
    rawSummary: "Supplied Qatar Recruitment Data and Recruitment Process.",
    rawText:
      "Minimum age 21; arm reach 212 cm; high school certificate; fluent English; excellent health and fitness; ability to relocate to Doha; online application; event documents.",
    confidence: "high",
    status: "approved",
    extractedFacts: [
      fact(
        "recruitment",
        "official_career_page",
        "Qatar Airways Cabin Crew Recruitment.",
        cabinCrew,
      ),
      fact(
        "application",
        "search_jobs",
        "Current vacancies are listed on Search Jobs.",
        searchJobs,
      ),
      fact("recruitment", "minimum_age", "Minimum age 21.", cabinCrew),
      fact("recruitment", "arm_reach", "Minimum arm reach 212 cm.", cabinCrew),
      fact("recruitment", "education", "High School Certificate.", cabinCrew),
      fact(
        "language",
        "english",
        "Fluent English, written and spoken.",
        cabinCrew,
      ),
      fact(
        "recruitment",
        "health_fitness",
        "Excellent health and fitness.",
        cabinCrew,
      ),
      fact(
        "recruitment",
        "relocation",
        "Ability to relocate to Doha.",
        cabinCrew,
      ),
      fact(
        "service",
        "service_attributes",
        "Passion for service and exceptional interpersonal skills.",
        cabinCrew,
      ),
      fact(
        "application",
        "event_documents",
        "CV, passport-sized photo, and invitation copy for the event day.",
        cabinCrew,
      ),
    ],
  },
  {
    id: "qatar-preparation-candidates-20260727",
    airlineId: "qatar_airways",
    sourceTitle:
      "Supplied Qatar interview and application preparation candidates",
    sourceUrl: cabinCrew,
    sourceType: "Interview Preparation and Application Coaching",
    collectedBy: "manual",
    collectedAt,
    sourceDate: "2026-07-27",
    sourceGrade: "C",
    rawSummary:
      "Supplied support prompts and coaching directions; not actual interview questions.",
    rawText:
      "Preparation prompts for motivation, service, teamwork, safety, language, and multicultural communication. Motivation directions: service excellence, multicultural teamwork, global environment, customer experience. Avoid overseas-life-only emphasis and unsupported brand claims.",
    confidence: "medium",
    status: "approved",
    extractedFacts: [
      fact(
        "interview",
        "question_motivation",
        "지원 준비용 예상 질문: Why Qatar Airways?",
        cabinCrew,
        "C",
      ),
      fact(
        "interview",
        "question_service",
        "지원 준비용 예상 질문: Tell us about a time you handled a difficult customer.",
        cabinCrew,
        "C",
      ),
      fact(
        "interview",
        "question_teamwork",
        "지원 준비용 예상 질문: Tell us about a time you worked closely with a team under pressure.",
        cabinCrew,
        "C",
      ),
      fact(
        "interview",
        "question_safety",
        "지원 준비용 예상 질문: What would you do if you noticed a safety risk during service?",
        cabinCrew,
        "C",
      ),
      fact(
        "interview",
        "question_language",
        "지원 준비용 예상 질문: Please introduce yourself in English.",
        cabinCrew,
        "C",
      ),
      fact(
        "interview",
        "question_multicultural",
        "지원 준비용 예상 질문: How do you adapt communication for customers from different cultures?",
        cabinCrew,
        "C",
      ),
      fact(
        "application",
        "coach_message_motivation",
        "Connect service excellence, multicultural teamwork, global environment, and customer experience to selected evidence.",
        cabinCrew,
        "C",
      ),
      fact(
        "application",
        "good_direction_motivation",
        "service excellence",
        cabinCrew,
        "C",
      ),
      fact(
        "application",
        "good_direction_motivation",
        "multicultural teamwork",
        cabinCrew,
        "C",
      ),
      fact(
        "application",
        "good_direction_motivation",
        "global environment",
        cabinCrew,
        "C",
      ),
      fact(
        "application",
        "good_direction_motivation",
        "customer experience",
        cabinCrew,
        "C",
      ),
      fact(
        "application",
        "avoid_pattern_motivation",
        "Emphasizing overseas life only.",
        cabinCrew,
        "C",
      ),
      fact(
        "application",
        "avoid_pattern_motivation",
        "Applying without a connection to brand understanding.",
        cabinCrew,
        "C",
      ),
    ],
  },
  {
    id: "qatar-needs-review-20260727",
    airlineId: "qatar_airways",
    sourceTitle: "Supplied Qatar items requiring confirmation",
    sourceUrl: careers,
    sourceType: "Needs review",
    collectedBy: "manual",
    collectedAt,
    sourceDate: "2026-07-27",
    sourceGrade: "E",
    rawSummary:
      "Founding year, tattoo policy, full interview stages, medical, training, and live regional eligibility require confirmation.",
    rawText:
      "Needs review: founding year, tattoo policy, interview stages, medical, training, and current regional eligibility.",
    confidence: "low",
    status: "reviewing",
    extractedFacts: [
      fact("profile", "founding_year", "Requires confirmation.", careers, "E"),
      fact(
        "recruitment",
        "tattoo_policy",
        "Requires confirmation.",
        careers,
        "E",
      ),
      fact(
        "interview",
        "selection_steps",
        "Full interview stages require confirmation.",
        careers,
        "E",
      ),
      fact(
        "safety",
        "medical",
        "Medical requirements require confirmation.",
        careers,
        "E",
      ),
      fact(
        "recruitment",
        "training",
        "Training details require confirmation.",
        careers,
        "E",
      ),
      fact(
        "application",
        "regional_eligibility",
        "Current regional eligibility requires confirmation in each vacancy.",
        searchJobs,
        "E",
      ),
    ],
  },
];

/** Candidate only: verified source facts are review-ready; the profile remains unpublished. */
export const qatarKnowledgeProfileCandidate: Partial<AirlineKnowledgeProfile> =
  {
    id: "profile-qatar-airways",
    airlineId: "qatar_airways",
    reviewStatus: "reviewed",
    publishStatus: "published",
    overview: {
      officialName: "Qatar Airways",
      displayName: "Qatar Airways",
      countryCode: "QA",
      region: "middle_east",
      businessModel: "full_service",
      headquarters: "Doha, Qatar",
      primaryHubs: ["Hamad International Airport, Doha"],
      website: careers,
      brandIdentity: {
        value: "Award-winning, global growth, diverse backgrounds.",
        status: "verified",
        sourceIds: ["qatar-profile-20260727"],
      },
      servicePhilosophy: "Service excellence and multicultural teamwork.",
      customerFocus: {
        value: "Exceptional interpersonal service for customers.",
        status: "verified",
        sourceIds: ["qatar-profile-20260727"],
      },
      safetyCulture: {
        value: "Excellent health and fitness are listed as a requirement.",
        status: "verified",
        sourceIds: ["qatar-profile-20260727"],
      },
      desiredCompetencies: {
        value: [
          "customer_situation_handling",
          "interview_communication",
          "recruitment_language",
          "safety_and_role_judgment",
        ],
        status: "verified",
        sourceIds: ["qatar-recruitment-20260727"],
      },
    } as AirlineKnowledgeProfile["overview"],
    recruitmentProfile: {
      recruitmentLanguages: ["English"],
      applicationLanguages: ["English"],
      commonRecruitmentStages: ["application"],
      officialCareerPageUrl: cabinCrew,
      currentStatus: "unknown",
      checkedAt: "2026-07-27",
      eligibilityRequirements: {
        value: [
          "Minimum age 21.",
          "Minimum arm reach 212 cm.",
          "High School Certificate.",
          "Excellent health and fitness.",
          "Ability to relocate to Doha.",
        ],
        status: "verified",
        sourceIds: ["qatar-recruitment-20260727"],
      },
      languageRequirements: {
        value: ["Fluent English, written and spoken."],
        status: "verified",
        sourceIds: ["qatar-recruitment-20260727"],
      },
      selectionSteps: {
        status: "needs_review",
        sourceIds: ["qatar-needs-review-20260727"],
      },
      physicalRequirements: {
        status: "needs_review",
        sourceIds: ["qatar-needs-review-20260727"],
      },
      status: "reviewing",
    },
  };

export const qatarFaqDrafts: AirlineFAQ[] = [
  {
    id: "qatar-faq-apply",
    airlineId: "qatar_airways",
    category: "eligibility",
    question:
      "지원 준비 참고 FAQ: Qatar Airways 객실승무원 지원은 어디에서 확인하나요?",
    answer:
      "공식 Qatar Airways Careers와 Cabin Crew Recruitment 페이지에서 최신 공고와 조건을 확인해야 합니다.",
    sourceGrade: "A",
    sourceReference: careers,
    status: "published",
    publishStatus: "published",
    createdAt: collectedAt,
    updatedAt: collectedAt,
  },
  {
    id: "qatar-faq-requirements",
    airlineId: "qatar_airways",
    category: "eligibility",
    question: "지원 준비 참고 FAQ: 기본 조건은 어디에서 확인하나요?",
    answer:
      "공식 Cabin Crew Recruitment 페이지에서 최신 조건을 확인해야 합니다.",
    sourceGrade: "A",
    sourceReference: cabinCrew,
    status: "published",
    publishStatus: "published",
    createdAt: collectedAt,
    updatedAt: collectedAt,
  },
  {
    id: "qatar-faq-process",
    airlineId: "qatar_airways",
    category: "process",
    question: "지원 준비 참고 FAQ: 전체 인터뷰 단계는 공개되어 있나요?",
    answer:
      "제공된 공식 자료만으로 전체 단계가 분리되어 확인되지는 않아 추가 확인이 필요합니다.",
    sourceGrade: "E",
    sourceReference: cabinCrew,
    status: "draft",
    publishStatus: "unpublished",
    createdAt: collectedAt,
    updatedAt: collectedAt,
  },
];

const draftQuestion = (
  id: string,
  prompt: string,
  questionType: AirlineInterviewQuestion["questionType"],
  competencyTags: string[],
  recommendedExperienceTags: string[],
): AirlineInterviewQuestion => ({
  id,
  airlineId: "qatar_airways",
  prompt: `지원 준비용 예상 질문: ${prompt}`,
  questionType,
  competencyTags,
  recommendedExperienceTags,
  followUpQuestions: [],
  sourceReferences: [cabinCrew],
  status: "approved",
  publishStatus: "published",
});
export const qatarInterviewQuestionDrafts: AirlineInterviewQuestion[] = [
  draftQuestion(
    "qatar-question-motivation",
    "Why Qatar Airways?",
    "motivation",
    ["brand_understanding", "service_orientation", "global_mindset"],
    ["airline_research", "premium_service", "global_career"],
  ),
  draftQuestion(
    "qatar-question-cabin-crew-motivation",
    "Why do you want to become cabin crew?",
    "motivation",
    ["service_mindset", "resilience", "teamwork"],
    ["customer_service", "hospitality", "communication"],
  ),
  draftQuestion(
    "qatar-question-service",
    "Tell us about a time you handled a difficult customer.",
    "service",
    ["empathy", "de_escalation", "problem_solving"],
    ["complaint_handling", "service_recovery", "frontline_support"],
  ),
  draftQuestion(
    "qatar-question-teamwork",
    "Tell us about a time you worked closely with a team under pressure.",
    "experience",
    ["teamwork", "prioritization", "communication"],
    ["shift_work", "project_coordination", "crisis_support"],
  ),
  draftQuestion(
    "qatar-question-safety",
    "What would you do if you noticed a safety risk during service?",
    "safety",
    ["situational_judgment", "procedure_compliance", "calmness"],
    ["risk_reporting", "policy_adherence", "incident_awareness"],
  ),
  draftQuestion(
    "qatar-question-language",
    "Please introduce yourself in English.",
    "language",
    ["spoken_english", "structure", "clarity"],
    ["self_introduction", "career_summary", "service_example"],
  ),
  draftQuestion(
    "qatar-question-language-service",
    "How would you handle a customer complaint in English?",
    "language",
    ["service_language", "conflict_resolution", "clarity"],
    ["guest_handling", "escalation", "apology_and_explain"],
  ),
  draftQuestion(
    "qatar-question-multicultural",
    "How do you adapt communication for customers from different cultures?",
    "experience",
    ["cultural_awareness", "adaptability", "respect"],
    ["multicultural_team", "overseas_experience", "diverse_customer_service"],
  ),
];

export const qatarCoachingInsightDrafts: AirlineCoachingInsight[] = [
  {
    id: "qatar-insight-motivation",
    airlineId: "qatar_airways",
    topic: "motivation",
    coachMessage:
      "Qatar Airways 지원동기는 서비스 우수성, 다문화 팀워크, 글로벌 환경, 고객 경험을 선택한 경험과 연결하도록 안내합니다.",
    goodDirections: [
      "service excellence",
      "multicultural teamwork",
      "global environment",
      "customer experience",
    ],
    avoidPatterns: ["해외생활만 강조", "브랜드 이해 없는 지원"],
    recommendedExperienceTags: [
      "customer_service",
      "teamwork",
      "multicultural_experience",
    ],
    sourceReferences: [cabinCrew, pressRelease],
    status: "approved",
    publishStatus: "published",
  },
];
