"use client";

import { useEffect, useMemo, useState } from "react";
import { WeeklyReturnAction } from "@/components/weekly-report/weekly-return-action";
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Check,
  ChevronRight,
  FileText,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import ko from "@/lib/locales/ko.json";
import { airlines, airlineById } from "@/lib/airline-data";
import type { OnboardingAnswers } from "@/lib/onboarding-data";
import {
  experienceRepository,
  type CareerExperience,
} from "@/lib/experience-repository";
import {
  analyzeApplicationAnswerWithAirlineContext,
  coachingQuestionsFor,
  createAnswerVersion,
  createApplicationAnswer,
  defaultStructure,
  duplicateForAirline,
  generateApplicationDraftWithPublishedKnowledge,
  getApplicationAirlineContext,
  getApplicationAnswer,
  findJourneyWorkDraft,
  LEGACY_ACTIVE_WORK_DRAFT_ID,
  getVerifiedAirlineContext,
  listApplicationAnswers,
  listAnswerVersions,
  listPrompts,
  practiceApplicationPrompts,
  recommendAirlineExperienceMatches,
  recommendApplicationExperiences,
  restoreAnswerVersion,
  saveCustomPrompt,
  saveWorkDraft,
  type ApplicationAirlineContext,
  type ApplicationAnswer,
  type ApplicationAnswerAnalysis,
  type ApplicationAnswerVersion,
  type ApplicationDocumentType,
  type ApplicationDraft,
  type ApplicationPrompt,
  type DraftEvidence,
  type StructureBlock,
} from "@/lib/application-answer-repository";
import {
  airlineJourneyDraftId,
  applicationPromptFromJourneyContext,
  type AirlineJourneyContext,
} from "@/lib/airline-journey-context";
import { cn } from "@/lib/utils";
import {
  selectApplicationInterviewDrills,
  type ApplicationInterviewDrillCandidate,
} from "@/lib/application-interview-drill";
import { loadInterviewAttempts } from "@/lib/interview-practice-data";
import { interviewPracticeQueueRepository } from "@/lib/interview-practice-queue";
import { AnalysisProvenanceHint } from "@/components/analysis-provenance-hint";
import { TrainingLoopPanel } from "@/components/interview-practice/interview-practice-components";
import {
  applicationRewriteEvidence,
  buildApplicationTrainingLoopModel,
  type TrainingLoopAction,
} from "@/lib/training-loop";
import { loadSelfIntroductionAttempts } from "@/lib/self-introduction-data";
import { loadInterviewSessions } from "@/lib/mock-interview-session";
import { questionProvenanceLabels } from "@/lib/airline-question-provenance";

const t = ko.applicationCoach;
const documentTypes = Object.keys(t.documents) as ApplicationDocumentType[];
type Step =
  | "home"
  | "airline"
  | "document"
  | "prompt"
  | "experience"
  | "coaching"
  | "structure"
  | "editor"
  | "analysis"
  | "detail"
  | "versions"
  | "convert"
  /** Rewriting a saved answer: the same editor and the same analyzer, saved as the next version. */
  | "rewrite"
  | "rewrite_analysis";
const card =
  "rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold";

function Screen({
  title,
  subtitle,
  onBack,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="application-coach-screen flex h-full flex-col bg-background">
      <header className="border-b border-border bg-card px-5 pb-4 pt-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1500px] items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label={t.back}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-full p-2 hover:bg-secondary focus-visible:ring-2 focus-visible:ring-gold"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div>
            <span className="eyebrow text-gold">APPLICATION COACH</span>
            <h1 className="mt-2 text-xl font-bold text-navy">{title}</h1>
            {subtitle && (
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1500px] flex-1 overflow-y-auto px-5 pb-32 pt-5 lg:px-8 lg:pt-7">{children}</main>
      {footer && (
        <footer className="absolute inset-x-0 bottom-0 border-t border-border bg-card/95 p-4 pb-safe backdrop-blur">
          <div className="mx-auto w-full max-w-[960px]">{footer}</div>
        </footer>
      )}
    </div>
  );
}
const PrimaryButton = ({
  children,
  onClick,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="h-12 w-full rounded-2xl bg-navy px-4 font-bold text-ivory disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
  >
    {children}
  </button>
);

export function ApplicationAnswerCard({
  answer,
  onOpen,
}: {
  answer: ApplicationAnswer;
  onOpen: (answer: ApplicationAnswer) => void;
}) {
  const airlineName =
    answer.sourceContextSnapshot?.airlineName ??
    (answer.airlineId ? airlineById.get(answer.airlineId)?.name : undefined) ??
    "범용 객실승무원";
  return (
    <button
      type="button"
      onClick={() => onOpen(answer)}
      className={cn(card, "w-full")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-xs font-semibold text-gold">{airlineName}</span>
          <h3 className="mt-1 font-bold text-navy line-clamp-2">
            {answer.title}
          </h3>
          <p className="mt-2 text-xs text-muted-foreground">
            {t.documents[answer.documentType]} · {t.status[answer.status]}
          </p>
        </div>
        <ChevronRight className="mt-2 h-5 w-5 shrink-0 text-muted-foreground" />
      </div>
    </button>
  );
}
export function ApplicationCoachHome({
  answers,
  onNew,
  onOpen,
  onExit,
  returnLabel,
}: {
  answers: ApplicationAnswer[];
  onNew: () => void;
  onOpen: (a: ApplicationAnswer) => void;
  /** Leaves the coach (back arrow in the header). Always offered so the home step is never a dead end on mobile. */
  onExit?: () => void;
  /** When the coach was opened from an airline workspace, a labelled return CTA is shown above the summary. */
  returnLabel?: string;
}) {
  const airlineCount = new Set(answers.map((a) => a.airlineId).filter(Boolean))
    .size;
  return (
    <Screen title={t.title} subtitle={t.subtitle} onBack={onExit}>
      {onExit && returnLabel && (
        <button
          type="button"
          onClick={onExit}
          data-testid="application-coach-journey-return"
          className="mb-4 min-h-11 w-full rounded-xl border border-navy text-sm font-bold text-navy"
        >
          {returnLabel}
        </button>
      )}
      <section className="grid grid-cols-2 gap-3">
        <Summary label={t.savedAnswers} value={String(answers.length)} />
        <Summary label={t.airlinesInProgress} value={String(airlineCount)} />
        <Summary
          label={t.lastEdited}
          value={
            answers[0]
              ? new Date(answers[0].updatedAt).toLocaleDateString("ko-KR")
              : "-"
          }
        />
        <Summary
          label={t.corePromptMissing}
          value={String(
            Math.max(0, 6 - new Set(answers.map((a) => a.promptId)).size),
          )}
        />
      </section>
      <button
        type="button"
        onClick={onNew}
        className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-navy font-bold text-ivory focus-visible:ring-2 focus-visible:ring-gold"
      >
        <Plus className="h-5 w-5" />
        {t.newAnswer}
      </button>
      <section className="mt-7">
        <h2 className="text-lg font-bold text-navy">{t.recent}</h2>
        <div className="mt-3 space-y-3">
          {answers.length ? (
            answers
              .slice(0, 5)
              .map((a) => (
                <ApplicationAnswerCard key={a.id} answer={a} onOpen={onOpen} />
              ))
          ) : (
            <div
              className={cn(
                card,
                "text-sm leading-relaxed text-muted-foreground",
              )}
            >
              {t.empty}
            </div>
          )}
        </div>
      </section>
      <section className="mt-7">
        <h2 className="text-lg font-bold text-navy">{t.recommended}</h2>
        <div className="mt-3 rounded-2xl bg-secondary/60 p-4 text-sm leading-relaxed text-midnight">
          {answers.length
            ? "최근 답변의 항공사 연결 문장을 검토해 보세요."
            : "지원동기 구조 만들기부터 시작해 보세요."}
        </div>
      </section>
    </Screen>
  );
}
function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <strong className="text-xl text-navy">{value}</strong>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function AirlineContextSelector({
  selected,
  onSelect,
  onNext,
}: {
  selected?: string;
  onSelect: (id?: string) => void;
  onNext: () => void;
}) {
  const context = getVerifiedAirlineContext(selected);
  return (
    <Screen
      title={t.selectAirline}
      onBack={undefined}
      footer={<PrimaryButton onClick={onNext}>{t.next}</PrimaryButton>}
    >
      <button
        type="button"
        onClick={() => onSelect(undefined)}
        className={cn(
          card,
          "mb-3 w-full",
          !selected && "border-navy ring-1 ring-navy",
        )}
      >
        <strong>{t.generalAnswer}</strong>
      </button>
      <div className="grid grid-cols-2 gap-3">
        {airlines.map((a) => (
          <button
            type="button"
            key={a.id}
            onClick={() => onSelect(a.id)}
            className={cn(
              card,
              selected === a.id && "border-navy ring-1 ring-navy",
            )}
          >
            <strong className="text-sm text-navy">{a.name}</strong>
            <p className="mt-1 text-xs text-muted-foreground">
              {a.countryCode}
            </p>
          </button>
        ))}
      </div>
      <section
        className="mt-5 rounded-2xl bg-secondary/60 p-4"
        aria-live="polite"
      >
        {context ? (
          <>
            <div className="flex gap-2 text-sm font-bold text-teal">
              <ShieldCheck className="h-5 w-5" />
              {t.verifiedContext}
            </div>
            <p className="mt-2 text-sm text-midnight">
              {context.servicePhilosophy || context.cabinCrewRoleSummary}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {context.coreValues.join(" · ")} ·{" "}
              {context.recruitmentLanguages.join(", ")}
            </p>
          </>
        ) : (
          <p className="whitespace-pre-line text-sm leading-relaxed text-midnight">
            {t.insufficientContext}
          </p>
        )}
      </section>
    </Screen>
  );
}
export function DocumentTypeSelector({
  selected,
  onSelect,
  onBack,
  onNext,
}: {
  selected?: ApplicationDocumentType;
  onSelect: (x: ApplicationDocumentType) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <Screen
      title={t.selectDocument}
      onBack={onBack}
      footer={
        <PrimaryButton onClick={onNext} disabled={!selected}>
          {t.next}
        </PrimaryButton>
      }
    >
      <div className="space-y-3">
        {documentTypes.map((type) => (
          <button
            type="button"
            key={type}
            onClick={() => onSelect(type)}
            className={cn(
              card,
              "flex w-full items-center gap-3",
              selected === type && "border-navy ring-1 ring-navy",
            )}
          >
            <FileText className="h-5 w-5 text-gold" />
            <strong>{t.documents[type]}</strong>
            {selected === type && (
              <Check className="ml-auto h-5 w-5 text-teal" />
            )}
          </button>
        ))}
      </div>
    </Screen>
  );
}
export function ApplicationPromptCard({
  prompt,
  selected,
  onSelect,
}: {
  prompt: ApplicationPrompt;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(card, "w-full", selected && "border-navy ring-1 ring-navy")}
    >
      <span className="text-xs font-semibold text-gold">
        {t.source[prompt.sourceType]}
      </span>
      <p className="mt-2 font-semibold leading-relaxed text-navy">
        {prompt.prompt}
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
        <span>
          {prompt.characterLimit
            ? `${prompt.characterLimit}${t.characterLimit}`
            : prompt.wordLimit
              ? `${prompt.wordLimit}${t.wordLimit}`
              : "제한 없음"}
        </span>
        <span>· {prompt.recommendedStructure}</span>
        <span>· {prompt.targetCapabilities.join(", ")}</span>
      </div>
    </button>
  );
}
export function ApplicationPromptList({
  airlineId,
  documentType,
  selected,
  onSelect,
  onCustom,
  onBack,
  onNext,
}: {
  airlineId?: string;
  documentType: ApplicationDocumentType;
  selected?: ApplicationPrompt;
  onSelect: (p: ApplicationPrompt) => void;
  onCustom: (p: ApplicationPrompt) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const prompts = listPrompts(airlineId).filter(
    (p) =>
      p.documentType === documentType || p.sourceType !== "practice_template",
  );
  const [custom, setCustom] = useState("");
  const [limit, setLimit] = useState("");
  function addCustom() {
    if (!custom.trim()) return;
    const prompt: ApplicationPrompt = {
      id: `custom-${Date.now()}`,
      airlineId,
      documentType,
      prompt: custom.trim(),
      locale: "ko",
      sourceType: "custom_user_input",
      sourceIds: [],
      characterLimit: limit ? Number(limit) : undefined,
      recommendedStructure: "custom",
      targetCapabilities: ["application_readiness"],
      status: "custom",
    };
    saveCustomPrompt(prompt);
    onCustom(prompt);
  }
  return (
    <Screen
      title={t.selectPrompt}
      onBack={onBack}
      footer={
        <PrimaryButton onClick={onNext} disabled={!selected}>
          {t.next}
        </PrimaryButton>
      }
    >
      <div className="space-y-3">
        {prompts.map((p) => (
          <ApplicationPromptCard
            key={p.id}
            prompt={p}
            selected={selected?.id === p.id}
            onSelect={() => onSelect(p)}
          />
        ))}
      </div>
      <section className="mt-6 rounded-2xl border border-border bg-card p-4">
        <h2 className="font-bold text-navy">{t.customPrompt}</h2>
        <label
          className="mt-3 block text-sm font-semibold"
          htmlFor="custom-prompt"
        >
          {t.customPromptLabel}
        </label>
        <textarea
          id="custom-prompt"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          rows={4}
          className="mt-2 w-full rounded-xl border border-input bg-background p-3 text-sm"
        />
        <label
          className="mt-3 block text-sm font-semibold"
          htmlFor="custom-limit"
        >
          {t.characterLimit}
        </label>
        <input
          id="custom-limit"
          type="number"
          min="1"
          value={limit}
          onChange={(e) => setLimit(e.target.value)}
          className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3"
        />
        <button
          type="button"
          onClick={addCustom}
          disabled={!custom.trim()}
          className="mt-3 h-11 w-full rounded-xl border border-navy font-semibold text-navy disabled:opacity-40"
        >
          {t.customPrompt}
        </button>
      </section>
    </Screen>
  );
}

export function ApplicationExperiencePicker({
  prompt,
  airlineId,
  selected,
  onSelect,
  onAdd,
  onBack,
  onNext,
}: {
  prompt: ApplicationPrompt;
  airlineId?: string;
  selected: string[];
  onSelect: (ids: string[]) => void;
  onAdd: () => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const stored = experienceRepository.load().experiences;
  const ranked = recommendApplicationExperiences(prompt, stored);
  // Experiences already linked to this draft (e.g. returned from the experience library) stay visible even when the
  // rule-based match score is 0, so a journey link is never silently hidden.
  const recommendations = [
    ...ranked,
    ...stored
      .filter((experience) => selected.includes(experience.id) && !ranked.some((item) => item.experience.id === experience.id))
      .map((experience) => ({ experience, reason: t.linkedExperienceReason })),
  ];
  const airlineMatches = new Map(
    recommendAirlineExperienceMatches(airlineId).map(
      ({ experience, match }) => [experience.id, match],
    ),
  );
  function toggle(id: string) {
    onSelect(
      selected.includes(id)
        ? selected.filter((x) => x !== id)
        : selected.length < 2
          ? [...selected, id]
          : selected,
    );
  }
  return (
    <Screen
      title={t.selectExperience}
      subtitle={t.experienceHelp}
      onBack={onBack}
      footer={<PrimaryButton onClick={onNext}>{t.next}</PrimaryButton>}
    >
      <p className="mb-3 rounded-xl bg-secondary/60 p-3 text-xs leading-relaxed text-muted-foreground">저장한 경험의 태그와 문항 기준을 규칙으로 비교한 추천이며 실제 AI 추천이 아닙니다.</p>
      <div className="space-y-3">
        {recommendations.map(({ experience, reason }) => {
          const airlineMatch = airlineMatches.get(experience.id);
          return (
            <button
              type="button"
              key={experience.id}
              onClick={() => toggle(experience.id)}
              className={cn(
                card,
                "w-full",
                selected.includes(experience.id) &&
                  "border-navy ring-1 ring-navy",
              )}
            >
              <div className="flex justify-between gap-2">
                <strong>{experience.title || "제목 없는 경험"}</strong>
                {selected.includes(experience.id) && (
                  <Check className="h-5 w-5 text-teal" />
                )}
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                {experience.shortSummary || experience.situation}
              </p>
              <p className="mt-3 text-xs text-gold">
                {t.matchReason}: {airlineMatch?.reason ?? reason}
              </p>
            </button>
          );
        })}
      </div>
      {!recommendations.length && (
        <div className={cn(card, "text-sm text-muted-foreground")} data-testid="application-experience-empty">
          {stored.length ? t.noMatchingExperience : t.noSavedExperience}
        </div>
      )}
      <button
        type="button"
        onClick={() => onSelect([])}
        className={cn(
          card,
          "mt-3 w-full",
          !selected.length && "border-navy ring-1 ring-navy",
        )}
      >
        {t.noExperience}
      </button>
      <button
        type="button"
        onClick={onAdd}
        className="mt-3 h-11 w-full rounded-xl border border-navy font-semibold text-navy"
      >
        <Plus className="mr-2 inline h-4 w-4" />
        {t.addExperience}
      </button>
    </Screen>
  );
}
export function ApplicationCoachingStep({
  prompt,
  airlineContext,
  answers,
  onChange,
  onBack,
  onNext,
}: {
  prompt: ApplicationPrompt;
  airlineContext?: ApplicationAirlineContext | null;
  answers: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const questions = coachingQuestionsFor(prompt),
    motivation = airlineContext?.publishedCoachingInsight.find(
      (item) => item.topic === "motivation",
    );
  return (
    <Screen
      title={t.coaching}
      onBack={onBack}
      footer={<PrimaryButton onClick={onNext}>{t.next}</PrimaryButton>}
    >
      {airlineContext && (
        <section className="mb-5 rounded-2xl bg-secondary/60 p-4">
          <h2 className="text-sm font-bold text-navy">
            {airlineContext.publishedProfile.name} 지원 방향
          </h2>
          {motivation && (
            <>
              <p className="mt-2 text-sm leading-relaxed text-midnight">
                {motivation.coachMessage}
              </p>
              <p className="mt-2 text-xs text-teal">
                연결 추천: {motivation.goodDirections.join(" · ")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                주의 표현: {motivation.avoidPatterns.join(" · ")}
              </p>
            </>
          )}
        </section>
      )}
      <div className="space-y-5">
        {questions.map((q, i) => (
          <div key={q}>
            <label
              htmlFor={`coach-${i}`}
              className="text-sm font-bold leading-relaxed text-navy"
            >
              {i + 1}. {q}
            </label>
            <textarea
              id={`coach-${i}`}
              value={answers[`q${i}`] ?? ""}
              onChange={(e) =>
                onChange({ ...answers, [`q${i}`]: e.target.value })
              }
              rows={3}
              className="mt-2 w-full rounded-xl border border-input bg-card p-3 text-sm"
            />
          </div>
        ))}
      </div>
      <p
        className="mt-4 flex items-center gap-2 text-xs text-teal"
        aria-live="polite"
      >
        <Check className="h-4 w-4" />
        {t.autosaved}
      </p>
    </Screen>
  );
}
export function ApplicationStructureBuilder({
  blocks,
  coreMessage,
  onBlocks,
  onCore,
  onBack,
  onCreate,
}: {
  blocks: StructureBlock[];
  coreMessage: string;
  onBlocks: (b: StructureBlock[]) => void;
  onCore: (s: string) => void;
  onBack: () => void;
  onCreate: () => void;
}) {
  function move(i: number, d: number) {
    const next = [...blocks],
      target = i + d;
    if (target < 0 || target >= next.length) return;
    [next[i], next[target]] = [next[target], next[i]];
    onBlocks(next);
  }
  return (
    <Screen
      title={t.structure}
      onBack={onBack}
      footer={
        <PrimaryButton onClick={onCreate} disabled={!blocks.length}>
          {t.createDraft}
        </PrimaryButton>
      }
    >
      <label htmlFor="core-message" className="text-sm font-bold">
        {t.coreMessage}
      </label>
      <textarea
        id="core-message"
        value={coreMessage}
        onChange={(e) => onCore(e.target.value)}
        rows={3}
        className="mt-2 w-full rounded-xl border border-input bg-card p-3"
      />
      <div className="mt-5 space-y-3">
        {blocks.map((block, i) => (
          <div key={block.id} className={cn(card, "flex items-center gap-2")}>
            <input
              aria-label={`${i + 1} 구조 항목`}
              value={block.label}
              onChange={(e) =>
                onBlocks(
                  blocks.map((x) =>
                    x.id === block.id ? { ...x, label: e.target.value } : x,
                  ),
                )
              }
              className="min-w-0 flex-1 bg-transparent font-semibold"
            />
            <button
              type="button"
              onClick={() => move(i, -1)}
              aria-label={t.moveUp}
            >
              <ArrowUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => move(i, 1)}
              aria-label={t.moveDown}
            >
              <ArrowDown className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onBlocks(blocks.filter((x) => x.id !== block.id))}
              aria-label={t.delete}
            >
              <Trash2 className="h-4 w-4 text-coral" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() =>
          onBlocks([
            ...blocks,
            {
              id: `block-${Date.now()}`,
              label: "새 항목",
              guidance: "사용자가 추가한 구조",
            },
          ])
        }
        className="mt-3 h-11 w-full rounded-xl border border-dashed border-navy text-sm font-semibold text-navy"
      >
        <Plus className="mr-2 inline h-4 w-4" />
        {t.addBlock}
      </button>
    </Screen>
  );
}
export function CharacterLimitIndicator({
  content,
  prompt,
}: {
  content: string;
  prompt: ApplicationPrompt;
}) {
  const words = content.trim() ? content.trim().split(/\s+/).length : 0,
    limit = prompt.characterLimit ?? prompt.wordLimit,
    current = prompt.characterLimit ? content.length : words,
    over = !!limit && current > limit;
  return (
    <div
      className={cn(
        "rounded-xl p-3 text-sm",
        over ? "bg-coral/10 text-coral" : "bg-secondary/60 text-midnight",
      )}
      role="status"
    >
      {content.length}자 · {words}단어
      {limit &&
        ` · ${current}/${limit} ${prompt.characterLimit ? "자" : "단어"}`}
    </div>
  );
}
export function DraftEvidencePanel({
  evidence,
}: {
  evidence: DraftEvidence[];
}) {
  return (
    <details className="rounded-2xl border border-border bg-card p-4">
      <summary className="cursor-pointer font-bold text-navy">
        {t.evidence}
      </summary>
      <div className="mt-3 space-y-3">
        {evidence.map((e) => (
          <div
            key={e.sentenceId}
            className="rounded-xl bg-secondary/50 p-3 text-xs"
          >
            <strong>{e.sentenceId}</strong>
            <p className="mt-1 text-muted-foreground">
              {e.sourceType}: {e.sourceExcerpt || t.genericEvidence}
            </p>
          </div>
        ))}
      </div>
    </details>
  );
}
export function RevisionComparison({
  before,
  after,
  onApply,
  onCancel,
}: {
  before: string;
  after: string;
  onApply: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.compare}
      className="absolute inset-0 z-50 flex items-end bg-black/40"
    >
      <div className="max-h-[80%] w-full overflow-y-auto rounded-t-3xl bg-background p-5">
        <h2 className="text-lg font-bold">{t.compare}</h2>
        <div className="mt-4 grid gap-3">
          <div className={card}>
            <span className="text-xs font-bold text-muted-foreground">
              {t.before}
            </span>
            <p className="mt-2 whitespace-pre-wrap text-sm">{before}</p>
          </div>
          <div className={card}>
            <span className="text-xs font-bold text-teal">
              {t.after} · 변경됨
            </span>
            <p className="mt-2 whitespace-pre-wrap text-sm">{after}</p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 flex-1 rounded-xl border border-navy font-semibold"
          >
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={onApply}
            className="h-11 flex-1 rounded-xl bg-navy font-semibold text-ivory"
          >
            {t.applyChange}
          </button>
        </div>
      </div>
    </div>
  );
}
export function ApplicationDraftEditor({
  prompt,
  airlineId,
  draft,
  onChange,
  onAnalyze,
  onBack,
  focusNote,
}: {
  prompt: ApplicationPrompt;
  airlineId?: string;
  draft: ApplicationDraft;
  onChange: (s: string) => void;
  onAnalyze: () => void;
  onBack: () => void;
  /** Reference only: the improvement point the user chose to work on. Never applied to the text. */
  focusNote?: string;
}) {
  const [comparison, setComparison] = useState<string>();
  function suggest(kind: string) {
    let next = draft.content;
    if (kind === "concise")
      next = next
        .split(/(?<=\.)\s+/)
        .filter((_, i) => i % 3 !== 2)
        .join(" ");
    else if (kind === "role")
      next = `${next} 이 경험을 고객과 안전을 함께 고려하는 객실승무원 업무에 연결하겠습니다.`;
    else if (kind === "airline") {
      const c = getVerifiedAirlineContext(airlineId);
      next = c?.servicePhilosophy
        ? `${next} ${c.airlineName}의 검수된 서비스 방향과 연결해 기여하겠습니다.`
        : next;
    } else next = next.replace(/매우|정말|항상/g, "");
    setComparison(next);
  }
  return (
    <Screen
      title={t.editor}
      onBack={onBack}
      footer={<PrimaryButton onClick={onAnalyze}>{t.analyze}</PrimaryButton>}
    >
      <p className="rounded-xl bg-secondary/50 p-3 text-sm font-semibold leading-relaxed">
        {prompt.prompt}
      </p>
      {focusNote ? (
        <p
          data-testid="application-rewrite-focus"
          className="mt-3 rounded-xl border border-gold/50 bg-gold/10 p-3 text-xs leading-relaxed text-midnight"
        >
          집중해서 다듬을 항목 · {focusNote}
        </p>
      ) : null}
      <div className="mt-4">
        <CharacterLimitIndicator content={draft.content} prompt={prompt} />
      </div>
      <label htmlFor="draft-editor" className="sr-only">
        {t.editor}
      </label>
      <textarea
        id="draft-editor"
        value={draft.content}
        onChange={(e) => onChange(e.target.value)}
        rows={16}
        className="mt-4 w-full rounded-2xl border border-input bg-card p-4 text-sm leading-7 focus:ring-2 focus:ring-gold"
      />
      <p className="mt-2 text-xs text-teal">{t.autosaved}</p>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
        {[
          ["polish", t.polish],
          ["concise", t.concise],
          ["role", t.roleConnection],
          ["airline", t.airlineConnection],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => suggest(id)}
            className="shrink-0 rounded-full border border-navy px-3 py-2 text-xs font-semibold text-navy"
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mt-4">
        <DraftEvidencePanel evidence={draft.evidence} />
      </div>
      {comparison !== undefined && (
        <RevisionComparison
          before={draft.content}
          after={comparison}
          onCancel={() => setComparison(undefined)}
          onApply={() => {
            onChange(comparison);
            setComparison(undefined);
          }}
        />
      )}
    </Screen>
  );
}
export function ApplicationEvaluationCard({
  evaluation,
}: {
  evaluation: ApplicationAnswerAnalysis["evaluations"][number];
}) {
  return (
    <article className={card}>
      <div className="flex items-center justify-between">
        <h3 className="font-bold">{evaluation.label}</h3>
        <strong
          className={
            evaluation.status === "strong"
              ? "text-teal"
              : evaluation.status === "adequate"
                ? "text-gold"
                : "text-coral"
          }
        >
          {evaluation.score}
        </strong>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        {evaluation.feedback}
      </p>
      <p className="mt-2 text-sm font-medium text-midnight">
        {evaluation.suggestion}
      </p>
    </article>
  );
}
export function ApplicationAnalysisResult({
  analysis,
  prompt,
  draft,
  onSave,
  onBack,
}: {
  analysis: ApplicationAnswerAnalysis;
  prompt: ApplicationPrompt;
  draft: ApplicationDraft;
  onSave: () => void;
  onBack: () => void;
}) {
  return (
    <Screen
      title={t.analysisTitle}
      onBack={onBack}
      footer={<PrimaryButton onClick={onSave}>{t.saveVersion}</PrimaryButton>}
    >
      <section className="rounded-3xl bg-navy p-5 text-ivory">
        <span className="text-xs text-ivory/70">{t.overall}</span>
        <strong className="mt-2 block text-4xl">
          {analysis.overallCompleteness}
        </strong>
        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-ivory/60">{t.best}</span>
            <p className="mt-1 font-semibold">{analysis.strongestPoint}</p>
          </div>
          <div>
            <span className="text-ivory/60">{t.firstFix}</span>
            <p className="mt-1 font-semibold">{analysis.firstImprovement}</p>
          </div>
        </div>
      </section>
      <div className="mt-4">
        <AnalysisProvenanceHint kinds={["deterministic"]} note="작성 내용과 연결된 근거를 정해진 기준으로 점검한 참고 지표이며 실제 AI 평가나 합격 가능성 점수가 아닙니다." />
      </div>
      <div className="mt-4">
        <CharacterLimitIndicator content={draft.content} prompt={prompt} />
      </div>
      {analysis.airlineContextLimited && (
        <p className="mt-4 rounded-2xl bg-gold/15 p-4 text-sm leading-relaxed text-midnight">
          {t.limitedEvaluation}
        </p>
      )}
      <div className="mt-5 space-y-3">
        {analysis.evaluations.map((e) => (
          <ApplicationEvaluationCard key={e.key} evaluation={e} />
        ))}
      </div>
    </Screen>
  );
}
export function AnswerVersionHistory({
  answer,
  onBack,
  onRestore,
}: {
  answer: ApplicationAnswer;
  onBack: () => void;
  onRestore: () => void;
}) {
  const versions = listAnswerVersions(answer.id);
  const [selected, setSelected] = useState<ApplicationAnswerVersion>();
  return (
    <Screen title={t.versions} onBack={onBack}>
      <div className="space-y-3">
        {versions.map((v) => (
          <button
            type="button"
            key={v.id}
            onClick={() => setSelected(v)}
            className={cn(card, "w-full")}
          >
            <strong>Version {v.version}</strong>
            <p className="mt-1 text-xs text-muted-foreground">
              {v.changeReason} · {new Date(v.createdAt).toLocaleString("ko-KR")}
            </p>
            <p className="mt-2 line-clamp-2 text-sm">{v.content}</p>
          </button>
        ))}
      </div>
      {selected && (
        <div className="mt-4 rounded-2xl border border-border bg-card p-4">
          <p className="whitespace-pre-wrap text-sm">{selected.content}</p>
          <button
            type="button"
            onClick={() => {
              restoreAnswerVersion(answer.id, selected.id);
              onRestore();
            }}
            className="mt-4 h-11 w-full rounded-xl bg-navy font-semibold text-ivory"
          >
            {t.restore}
          </button>
        </div>
      )}
    </Screen>
  );
}
export function AirlineVersionConverter({
  answer,
  onBack,
  onCreated,
}: {
  answer: ApplicationAnswer;
  onBack: () => void;
  onCreated: (a: ApplicationAnswer) => void;
}) {
  return (
    <Screen title={t.otherAirline} onBack={onBack}>
      <div className="grid grid-cols-2 gap-3">
        {airlines
          .filter((a) => a.id !== answer.airlineId)
          .map((a) => (
            <button
              type="button"
              key={a.id}
              onClick={() => {
                const created = duplicateForAirline(answer.id, a.id);
                if (created) onCreated(created);
              }}
              className={card}
            >
              <strong className="text-sm">{a.name}</strong>
              <p className="mt-1 text-xs text-muted-foreground">
                {getVerifiedAirlineContext(a.id)
                  ? t.verifiedContext
                  : "범용 문맥"}
              </p>
            </button>
          ))}
      </div>
    </Screen>
  );
}
export function ApplicationAnswerDetail({
  answer,
  onBack,
  onVersions,
  onConvert,
  onPractice,
  onWeeklyReturn,
  onJourneyReturn,
  onTrainingLoopAction,
}: {
  answer: ApplicationAnswer;
  onBack: () => void;
  onVersions: () => void;
  onConvert: () => void;
  onPractice: (candidate: ApplicationInterviewDrillCandidate) => void;
  onWeeklyReturn?: () => void;
  onJourneyReturn?: () => void;
  /** Present when the saved answer can enter the shared training loop (rewrite or next practice). */
  onTrainingLoopAction?: (action: TrainingLoopAction) => void;
}) {
  const versions = listAnswerVersions(answer.id);
  const version = versions.find((v) => v.id === answer.currentVersionId);
  const drills = selectApplicationInterviewDrills({
      answer,
      version,
      recentQuestionIds: loadInterviewAttempts()
        .filter((attempt) => attempt.completed)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 5)
        .map((attempt) => attempt.questionId),
      openQuestionIds: interviewPracticeQueueRepository
        .listOpen()
        .map((item) => item.questionId),
    }),
    airlineName =
      answer.sourceContextSnapshot?.airlineName ??
      (answer.airlineId
        ? airlineById.get(answer.airlineId)?.name
        : undefined) ??
      "범용";
  return (
    <Screen title={answer.title} onBack={onBack}>
      {onJourneyReturn && <button type="button" onClick={onJourneyReturn} className="mb-4 min-h-11 w-full rounded-xl border border-navy text-sm font-bold text-navy">타겟 항공사 준비로 돌아가기</button>}
      {onWeeklyReturn && <div className="mb-4"><WeeklyReturnAction onReturn={onWeeklyReturn} /></div>}
      <div className={card}>
        <span className="text-xs font-semibold text-gold">
          {airlineName} · {t.documents[answer.documentType]}
        </span>
        {/* The question's provenance travels with the answer, so an archived official question keeps
            saying it is archived here and is never shown as a current one. */}
        {answer.journeyContext?.provenance ? (
          <p data-testid="application-answer-provenance" className="mt-2 text-xs text-muted-foreground">
            질문 출처 {questionProvenanceLabels[answer.journeyContext.provenance]}
            {answer.journeyContext.recruitmentPeriod ? ` · ${answer.journeyContext.recruitmentPeriod}` : ""}
            {answer.journeyContext.provenance === "OFFICIAL_ARCHIVE" ? " · 현재 채용 질문과 다를 수 있습니다." : ""}
          </p>
        ) : null}
        <p className="mt-4 whitespace-pre-wrap text-sm leading-7">
          {version?.content}
        </p>
      </div>
      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="font-bold">{t.usedExperiences}</h2>
        {answer.experienceSnapshots.length ? (
          answer.experienceSnapshots.map((e) => (
            <p key={e.id} className="mt-2 text-sm">
              • {e.title}
            </p>
          ))
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">연결된 경험 없음</p>
        )}
      </section>
      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="font-bold text-navy">지원서 약점 면접 Drill</h2>
        {drills.length ? (
          <div className="mt-3 space-y-3">
            {drills.map((candidate) => (
              <article
                key={candidate.questionId}
                className="rounded-2xl bg-secondary/60 p-4"
              >
                <span className="text-xs font-bold text-gold">
                  {candidate.priority === "primary" ? "PRIMARY" : "SECONDARY"}
                </span>
                <h3 className="mt-1 text-sm font-bold text-navy">
                  {candidate.question.shortTitle}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {candidate.recommendationExplanation}
                </p>
                <button
                  type="button"
                  onClick={() => onPractice(candidate)}
                  className="mt-3 h-11 w-full rounded-xl bg-navy px-4 text-sm font-semibold text-ivory focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                >
                  면접으로 연습하기
                </button>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            현재 답변에서는 우선 보완할 면접 Drill이 없습니다.
          </p>
        )}
      </section>
      <div className="mt-4 space-y-2">
        <button
          type="button"
          onClick={onVersions}
          className="h-11 w-full rounded-xl border border-navy font-semibold"
        >
          {t.versions}
        </button>
        <button
          type="button"
          onClick={onConvert}
          className="h-11 w-full rounded-xl border border-navy font-semibold"
        >
          {t.otherAirline}
        </button>
      </div>
      {/* The saved answer is the review point of the shared loop: the repository already holds this
          answer and its version, so nothing here completes anything on its own. The next practice is
          derived from the drill this answer produced plus the user's existing records. */}
      {onTrainingLoopAction ? (
        <TrainingLoopPanel
          loop={buildApplicationTrainingLoopModel({
            answer,
            versions,
            attempts: loadInterviewAttempts(),
            selfIntroductions: loadSelfIntroductionAttempts(),
            sessions: loadInterviewSessions(),
            interviewQuestionId: drills[0]?.questionId,
          })}
          onAction={onTrainingLoopAction}
        />
      ) : null}
    </Screen>
  );
}

export function ApplicationCoach({
  onExit,
  onOpenExperience,
  onPractice,
  initialAirlineId,
  weeklyReturnAnswerId,
  onWeeklyReturn,
  initialJourneyContext,
  onTrainingLoopNext,
}: {
  onExit: () => void;
  onOpenExperience: (context?: AirlineJourneyContext) => void;
  onPractice: (
    candidate: ApplicationInterviewDrillCandidate,
  ) => void;
  initialAirlineId?: string;
  weeklyReturnAnswerId?: string;
  onWeeklyReturn?: () => void;
  initialJourneyContext?: AirlineJourneyContext;
  /** Only "next" leaves the coach; a rewrite stays here so the answer context is never rebuilt. */
  onTrainingLoopNext?: (action: TrainingLoopAction) => void;
}) {
  // Canonical journey draft first, then the legacy "active" draft saved for the same airline before canonical ids existed.
  const journeyDraft = initialJourneyContext ? findJourneyWorkDraft(initialJourneyContext) : undefined;
  const journeyPrompt = journeyDraft?.prompt ?? applicationPromptFromJourneyContext(initialJourneyContext);
  const [step, setStep] = useState<Step>(journeyPrompt ? "experience" : "home"),
    [saved, setSaved] = useState<ApplicationAnswer[]>([]),
    [airlineId, setAirlineId] = useState<string | undefined>(journeyDraft?.airlineId ?? initialAirlineId),
    [documentType, setDocumentType] = useState<ApplicationDocumentType | undefined>(journeyDraft?.documentType ?? journeyPrompt?.documentType),
    [prompt, setPrompt] = useState<ApplicationPrompt | undefined>(journeyPrompt),
    [selectedExperienceIds, setSelectedExperienceIds] = useState<string[]>(journeyDraft?.selectedExperienceIds ?? []),
    [coachingAnswers, setCoachingAnswers] = useState<Record<string, string>>(
      journeyDraft?.coachingAnswers ?? {},
    ),
    [blocks, setBlocks] = useState<StructureBlock[]>(journeyDraft?.structure ?? []),
    [coreMessage, setCoreMessage] = useState(journeyDraft?.coreMessage ?? ""),
    [draft, setDraft] = useState<ApplicationDraft>(),
    [analysis, setAnalysis] = useState<ApplicationAnswerAnalysis>(),
    [current, setCurrent] = useState<ApplicationAnswer>(),
    // A rewrite of a saved answer: its own prompt, draft and analysis, so the create flow is untouched.
    [rewrite, setRewrite] = useState<{ prompt: ApplicationPrompt; draft: ApplicationDraft; focusNote?: string; focusKey?: string }>(),
    [rewriteAnalysis, setRewriteAnalysis] = useState<ApplicationAnswerAnalysis>();
  const experiences = experienceRepository.load().experiences;
  // Journey context that identifies this draft: the question's own context, or the airline-only ("general") context
  // when the coach was opened from an airline workspace without a specific question.
  const promptJourneyContext = prompt?.journeyContext;
  const draftJourneyContext = useMemo<AirlineJourneyContext | undefined>(
    () => promptJourneyContext ?? (initialJourneyContext ? { ...initialJourneyContext, airlineId: airlineId ?? initialJourneyContext.airlineId } : undefined),
    [promptJourneyContext, initialJourneyContext, airlineId],
  );
  const draftId = draftJourneyContext ? airlineJourneyDraftId(draftJourneyContext) : LEGACY_ACTIVE_WORK_DRAFT_ID;
  const journeyReturnLabel = initialJourneyContext?.origin === "airline_workspace" || initialJourneyContext?.origin === "application" ? t.journeyReturn : undefined;
  useEffect(() => setSaved(listApplicationAnswers()), []);
  useEffect(() => {
    if ((step === "experience" || step === "coaching") && prompt)
      saveWorkDraft({
        id: draftId,
        airlineId,
        documentType,
        prompt,
        selectedExperienceIds,
        coachingAnswers,
        structure: blocks,
        coreMessage,
        journeyContext: draftJourneyContext,
        updatedAt: new Date().toISOString(),
      });
  }, [
    draftId,
    draftJourneyContext,
    step,
    airlineId,
    documentType,
    prompt,
    selectedExperienceIds,
    coachingAnswers,
    blocks,
    coreMessage,
  ]);
  function restart() {
    setAirlineId(initialAirlineId);
    setDocumentType(undefined);
    setPrompt(undefined);
    setSelectedExperienceIds([]);
    setCoachingAnswers({});
    setBlocks([]);
    setCoreMessage("");
    setDraft(undefined);
    setAnalysis(undefined);
    setStep("airline");
  }
  function openExperienceLibrary() {
    if (prompt) saveWorkDraft({ id: draftId, airlineId, documentType, prompt, selectedExperienceIds, coachingAnswers, structure: blocks, coreMessage, journeyContext: draftJourneyContext, updatedAt: new Date().toISOString() });
    onOpenExperience(draftJourneyContext);
  }
  function makeDraft() {
    if (!prompt) return;
    const selected = experiences.filter((e) =>
      selectedExperienceIds.includes(e.id),
    );
    setDraft(
      generateApplicationDraftWithPublishedKnowledge({
        prompt,
        airlineId,
        experiences: selected,
        coachingAnswers,
        structure: blocks,
        coreMessage,
      }),
    );
    setStep("editor");
  }
  /**
   * The prompt this saved answer answers. The question's own journey context wins, then the prompt the
   * repository still lists for it; only when neither exists is a prompt rebuilt from the answer itself,
   * and that fallback is marked as the user's own input so a template is never promoted to official.
   */
  function promptForSavedAnswer(answer: ApplicationAnswer): ApplicationPrompt {
    const fromJourney = applicationPromptFromJourneyContext(answer.journeyContext);
    if (fromJourney) return fromJourney;
    const stored = listPrompts(answer.airlineId).find((item) => item.id === answer.promptId);
    if (stored) return stored;
    return {
      id: answer.promptId,
      airlineId: answer.airlineId,
      documentType: answer.documentType,
      prompt: answer.customPrompt ?? answer.title,
      locale: "ko",
      sourceType: "custom_user_input",
      sourceIds: [],
      recommendedStructure: "custom",
      targetCapabilities: [],
      status: "custom",
      journeyContext: answer.journeyContext,
    };
  }

  /** Opens the saved answer in the existing editor. Nothing is generated: the current version's own
   * text is the starting point and the evidence is the experiences still linked to the answer. */
  function openRewrite(answer: ApplicationAnswer, action: TrainingLoopAction) {
    const version = listAnswerVersions(answer.id).find((item) => item.id === answer.currentVersionId);
    if (!version) return;
    const rewritePrompt = promptForSavedAnswer(answer);
    const content = version.content;
    setRewriteAnalysis(undefined);
    setRewrite({
      prompt: rewritePrompt,
      draft: {
        id: `rewrite-${version.id}`,
        promptId: rewritePrompt.id,
        airlineId: answer.airlineId,
        documentType: answer.documentType,
        content,
        characterCount: content.length,
        wordCount: content.trim() ? content.trim().split(/\s+/).length : 0,
        evidence: applicationRewriteEvidence(answer, content),
        knowledgeSources: version.knowledgeSources,
        coachingInsightIds: version.coachingInsightIds,
        experienceIds: version.experienceIds ?? answer.selectedExperienceIds,
        version: version.version,
        createdAt: version.createdAt,
      },
      focusNote: action.kind === "focused_retake" ? action.reason : undefined,
      focusKey: action.focusKey,
    });
    setStep("rewrite");
  }

  /** Saves the rewrite as the next version of the same answer; the previous version is never overwritten. */
  function saveRewrite() {
    if (!current || !rewrite || !rewriteAnalysis) return;
    const reasons: ApplicationAnswerVersion["changeReason"][] = ["specificity", "role_connection", "airline_connection", "concise", "tone_change"];
    const matched = reasons.find((reason) => rewrite.focusKey?.endsWith(reason));
    const version = createAnswerVersion(current.id, rewrite.draft.content, matched ?? "manual_edit", rewriteAnalysis);
    if (!version) return;
    const refreshed = getApplicationAnswer(current.id);
    if (refreshed) setCurrent(refreshed);
    setSaved(listApplicationAnswers());
    setRewrite(undefined);
    setRewriteAnalysis(undefined);
    setStep("detail");
  }

  function handleTrainingLoopAction(answer: ApplicationAnswer, action: TrainingLoopAction) {
    if (action.kind === "retake" || action.kind === "focused_retake") {
      openRewrite(answer, action);
      return;
    }
    onTrainingLoopNext?.(action);
  }

  function save() {
    if (!prompt || !draft || !analysis) return;
    const selected = experiences.filter((e) =>
      selectedExperienceIds.includes(e.id),
    );
    const answer = createApplicationAnswer({
      prompt,
      airlineId,
      title: prompt.prompt,
      experiences: selected,
      draft,
      analysis,
    });
    if (!answer) return;
    setCurrent(answer);
    setSaved(listApplicationAnswers());
    setStep("detail");
  }
  if (step === "home")
    return (
      <ApplicationCoachHome
        answers={saved}
        onNew={restart}
        onOpen={(a) => {
          setCurrent(a);
          setStep("detail");
        }}
        onExit={onExit}
        returnLabel={journeyReturnLabel}
      />
    );
  if (step === "airline")
    return (
      <AirlineContextSelector
        selected={airlineId}
        onSelect={setAirlineId}
        onNext={() => setStep("document")}
      />
    );
  if (step === "document")
    return (
      <DocumentTypeSelector
        selected={documentType}
        onSelect={setDocumentType}
        onBack={() => setStep("home")}
        onNext={() => setStep("prompt")}
      />
    );
  if (step === "prompt" && documentType)
    return (
      <ApplicationPromptList
        airlineId={airlineId}
        documentType={documentType}
        selected={prompt}
        onSelect={setPrompt}
        onCustom={setPrompt}
        onBack={() => setStep("document")}
        onNext={() => setStep("experience")}
      />
    );
  if (step === "experience" && prompt)
    return (
      <ApplicationExperiencePicker
        prompt={prompt}
        airlineId={airlineId}
        selected={selectedExperienceIds}
        onSelect={setSelectedExperienceIds}
        onAdd={openExperienceLibrary}
        onBack={() => initialJourneyContext?.questionId ? onExit() : setStep("prompt")}
        onNext={() => setStep("coaching")}
      />
    );
  if (step === "coaching" && prompt)
    return (
      <ApplicationCoachingStep
        prompt={prompt}
        airlineContext={getApplicationAirlineContext(airlineId)}
        answers={coachingAnswers}
        onChange={setCoachingAnswers}
        onBack={() => setStep("experience")}
        onNext={() => {
          setBlocks(defaultStructure(prompt.recommendedStructure));
          setStep("structure");
        }}
      />
    );
  if (step === "structure")
    return (
      <ApplicationStructureBuilder
        blocks={blocks}
        coreMessage={coreMessage}
        onBlocks={setBlocks}
        onCore={setCoreMessage}
        onBack={() => setStep("coaching")}
        onCreate={makeDraft}
      />
    );
  if (step === "editor" && prompt && draft)
    return (
      <ApplicationDraftEditor
        prompt={prompt}
        airlineId={airlineId}
        draft={draft}
        onChange={(content) =>
          setDraft({
            ...draft,
            content,
            characterCount: content.length,
            wordCount: content.trim() ? content.trim().split(/\s+/).length : 0,
          })
        }
        onAnalyze={() => {
          setAnalysis(
            analyzeApplicationAnswerWithAirlineContext(
              draft.content,
              prompt,
              draft.evidence,
              airlineId,
            ),
          );
          setStep("analysis");
        }}
        onBack={() => setStep("structure")}
      />
    );
  if (step === "analysis" && prompt && draft && analysis)
    return (
      <ApplicationAnalysisResult
        analysis={analysis}
        prompt={prompt}
        draft={draft}
        onSave={save}
        onBack={() => setStep("editor")}
      />
    );
  if (step === "rewrite" && current && rewrite)
    return (
      <ApplicationDraftEditor
        prompt={rewrite.prompt}
        airlineId={current.airlineId}
        draft={rewrite.draft}
        focusNote={rewrite.focusNote}
        onChange={(content) =>
          setRewrite({
            ...rewrite,
            draft: {
              ...rewrite.draft,
              content,
              characterCount: content.length,
              wordCount: content.trim() ? content.trim().split(/\s+/).length : 0,
            },
          })
        }
        onAnalyze={() => {
          setRewriteAnalysis(
            analyzeApplicationAnswerWithAirlineContext(
              rewrite.draft.content,
              rewrite.prompt,
              rewrite.draft.evidence,
              current.airlineId,
            ),
          );
          setStep("rewrite_analysis");
        }}
        onBack={() => {
          setRewrite(undefined);
          setStep("detail");
        }}
      />
    );
  if (step === "rewrite_analysis" && current && rewrite && rewriteAnalysis)
    return (
      <ApplicationAnalysisResult
        analysis={rewriteAnalysis}
        prompt={rewrite.prompt}
        draft={rewrite.draft}
        onSave={saveRewrite}
        onBack={() => setStep("rewrite")}
      />
    );
  if (step === "versions" && current)
    return (
      <AnswerVersionHistory
        answer={current}
        onBack={() => setStep("detail")}
        onRestore={() => {
          const refreshed = getApplicationAnswer(current.id);
          if (refreshed) setCurrent(refreshed);
          setStep("detail");
        }}
      />
    );
  if (step === "convert" && current)
    return (
      <AirlineVersionConverter
        answer={current}
        onBack={() => setStep("detail")}
        onCreated={(a) => {
          setCurrent(a);
          setSaved(listApplicationAnswers());
          setStep("detail");
        }}
      />
    );
  if (step === "detail" && current)
    return (
      <ApplicationAnswerDetail
        answer={current}
        onWeeklyReturn={weeklyReturnAnswerId === current.id ? onWeeklyReturn : undefined}
        onJourneyReturn={current.journeyContext || journeyReturnLabel ? onExit : undefined}
        onBack={() => current.journeyContext ? onExit() : setStep("home")}
        onVersions={() => setStep("versions")}
        onConvert={() => setStep("convert")}
        onPractice={onPractice}
        onTrainingLoopAction={(action) => handleTrainingLoopAction(current, action)}
      />
    );
  return (
    <Screen title={t.title} onBack={onExit}>
      <PrimaryButton onClick={onExit}>{t.back}</PrimaryButton>
    </Screen>
  );
}
