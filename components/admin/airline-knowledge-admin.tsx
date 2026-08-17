"use client";

import { FormEvent, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { airlineById } from "@/lib/airline-data";
import { airlineMaster } from "@/lib/airline-master-data";
import { airlineKnowledgeRepository } from "@/lib/airline-knowledge-repository";
import {
  airlineResearchRepository,
  type AirlineResearchRecord,
} from "@/lib/airline-research-repository";
import {
  createResearchRecordFromImport,
  type AirlineResearchImportPayload,
} from "@/lib/airline-research-importer";
import {
  airlineCoachingInsightRepository,
  type AirlineCoachingInsight,
} from "@/lib/airline-knowledge-transformer";
import {
  airlineReviewWorkflow,
  canApprove,
  type ReviewEntity,
  type ReviewStatus,
} from "@/lib/airline-review-workflow";
import {
  emiratesFaqDrafts,
  emiratesInterviewQuestionDrafts,
  emiratesResearchRecords,
  emiratesCoachingInsightDrafts,
} from "@/lib/emirates-research-pack";
import {
  airlineRecruitmentRequirements,
  type AirlineRecruitmentRequirement,
  type CandidateVisibility,
  type RequirementVerificationStatus,
} from "@/lib/airline-recruitment-requirements";

type Tab =
  "overview" | "research" | "insights" | "sources" | "review" | "requirements";

export function AirlineKnowledgeAdmin({ onExit }: { onExit: () => void }) {
  const [store, setStore] = useState(() =>
    airlineKnowledgeRepository.initialize(),
  );
  const [research, setResearch] = useState<AirlineResearchRecord[]>(() =>
    airlineResearchRepository.load(),
  );
  const [insights, setInsights] = useState<AirlineCoachingInsight[]>(() =>
    airlineCoachingInsightRepository.load(),
  );
  const [requirements, setRequirements] = useState<
    AirlineRecruitmentRequirement[]
  >(airlineRecruitmentRequirements);
  const [selected, setSelected] = useState<string>();
  const [tab, setTab] = useState<Tab>("overview");
  const [importMode, setImportMode] = useState(false);
  const refresh = () => {
    setStore(airlineKnowledgeRepository.load());
    setResearch(airlineResearchRepository.load());
    setInsights(airlineCoachingInsightRepository.load());
  };
  const profile = store.profiles.find((item) => item.airlineId === selected);

  if (importMode)
    return (
      <ResearchImportPanel
        onBack={() => setImportMode(false)}
        onImported={() => {
          setResearch(airlineResearchRepository.load());
          setImportMode(false);
        }}
      />
    );
  if (!profile)
    return (
      <div className="flex h-full flex-col bg-background">
        <header className="border-b p-5">
          <button onClick={onExit} className="text-xs">
            Back
          </button>
          <h1 className="mt-3 text-xl font-bold">Airline knowledge admin</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Official, reviewed, and practice materials remain separated.
            Research never publishes automatically.
          </p>
          <button
            onClick={() => setImportMode(true)}
            className="mt-4 h-10 rounded-xl bg-navy px-4 text-xs font-bold text-ivory"
          >
            Research import
          </button>
        </header>
        <main className="flex-1 overflow-y-auto p-5">
          <section className="grid grid-cols-2 gap-2">
            <Metric name="Airlines" value={store.profiles.length} raw />
            <Metric name="Sources" value={store.resources.length} raw />
            <Metric name="Research queue" value={research.length} raw />
            <Metric name="Coaching insights" value={insights.length} raw />
          </section>
          <div className="mt-6 space-y-2">
            {store.profiles.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelected(item.airlineId)}
                className="w-full rounded-xl border bg-card p-4 text-left"
              >
                <b>{airlineById.get(item.airlineId)?.name ?? item.airlineId}</b>
                <p className="mt-1 text-xs text-muted-foreground">
                  Profile {item.completeness.overview}% · Recruitment{" "}
                  {item.completeness.recruitment}% · FAQ {item.completeness.faq}
                  %
                </p>
              </button>
            ))}
          </div>
        </main>
      </div>
    );

  const resources = store.resources.filter(
    (item) => item.airlineId === profile.airlineId,
  );
  const queue = research.filter((item) => item.airlineId === profile.airlineId);
  const coaching = insights.filter(
    (item) => item.airlineId === profile.airlineId,
  );
  const updateResearch = (
    id: string,
    status: "approved" | "rejected" | "reviewing" | "processing",
  ) => {
    airlineResearchRepository.updateStatus(id, status);
    setResearch(airlineResearchRepository.load());
  };
  const updateInsight = (
    id: string,
    status: "draft" | "reviewing" | "approved",
  ) => {
    airlineCoachingInsightRepository.updateStatus(id, status);
    setInsights(airlineCoachingInsightRepository.load());
  };
  const content: Record<Tab, React.ReactNode> = {
    overview: (
      <section className="space-y-3">
        <Metric
          name="Profile completeness"
          value={profile.completeness.overview}
        />
        <Metric
          name="Source completeness"
          value={profile.completeness.sources}
        />
        <p className="rounded-xl bg-secondary/60 p-4 text-sm">
          Raw research, rejected records, and drafts are excluded from AI
          context.
        </p>
      </section>
    ),
    research: <ResearchQueue records={queue} onStatus={updateResearch} />,
    insights: (
      <CoachingInsightQueue insights={coaching} onStatus={updateInsight} />
    ),
    sources: (
      <section className="space-y-3">
        {resources.map((item) => (
          <article key={item.id} className="rounded-xl border bg-card p-4">
            <b className="text-sm">{item.title}</b>
            <p className="mt-1 text-xs text-muted-foreground">
              {item.sourceGrade} · {item.verificationStatus} · {item.validity}
            </p>
            <button
              className="mt-2 rounded-lg border px-2 py-1 text-xs"
              onClick={() => {
                airlineReviewWorkflow.deprecate(item.id);
                refresh();
              }}
            >
              Mark deprecated
            </button>
          </article>
        ))}
      </section>
    ),
    review: <EmiratesReviewPanel />,
    requirements: (
      <RecruitmentRequirementsPanel
        requirements={requirements}
        onChange={(id, patch) =>
          setRequirements((items) =>
            items.map((item) =>
              item.id === id ? { ...item, ...patch } : item,
            ),
          )
        }
      />
    ),
  };
  return (
    <div className="flex h-full flex-col bg-background">
      <header className="flex items-center gap-3 border-b p-4">
        <button
          aria-label="Back to airline list"
          onClick={() => setSelected(undefined)}
        >
          <ChevronLeft />
        </button>
        <div>
          <h1 className="font-bold">{profile.overview.displayName}</h1>
          <p className="text-xs text-muted-foreground">
            Overall {profile.completeness.overall}%
          </p>
        </div>
      </header>
      <div className="flex gap-2 overflow-x-auto p-4">
        {(
          [
            "overview",
            "research",
            "insights",
            "sources",
            "review",
            "requirements",
          ] as Tab[]
        ).map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            aria-pressed={tab === item}
            className={`rounded-full px-3 py-2 text-xs ${tab === item ? "bg-navy text-ivory" : "bg-card"}`}
          >
            {item === "requirements" ? "Requirements" : item}
          </button>
        ))}
      </div>
      <main className="flex-1 overflow-y-auto p-4">
        {content[tab]}
        <button
          onClick={refresh}
          className="mt-5 h-10 w-full rounded-xl border border-border text-xs font-bold text-navy"
        >
          Refresh
        </button>
      </main>
    </div>
  );
}

function RecruitmentRequirementsPanel({
  requirements,
  onChange,
}: {
  requirements: AirlineRecruitmentRequirement[];
  onChange: (id: string, patch: Partial<AirlineRecruitmentRequirement>) => void;
}) {
  const [airline, setAirline] = useState(""),
    [status, setStatus] = useState(""),
    [visibility, setVisibility] = useState(""),
    [ai, setAi] = useState("");
  const items = requirements.filter(
    (item) =>
      (!airline || item.airlineId === airline) &&
      (!status || item.verificationStatus === status) &&
      (!visibility || item.candidateVisibility === visibility) &&
      (!ai || (ai === "enabled") === item.aiContextEnabled),
  );
  const updateAi = (item: AirlineRecruitmentRequirement, enabled: boolean) => {
    if (
      enabled &&
      (item.verificationStatus !== "verified" || !item.sourceReference.length)
    )
      return;
    onChange(item.id, { aiContextEnabled: enabled });
  };
  return (
    <section className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <select
          value={airline}
          onChange={(e) => setAirline(e.target.value)}
          className="h-10 rounded-lg border bg-card px-2 text-xs"
        >
          <option value="">All airlines</option>
          {["emirates", "qatar_airways", "etihad_airways"].map((x) => (
            <option key={x} value={x}>
              {airlineById.get(x)?.name}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-10 rounded-lg border bg-card px-2 text-xs"
        >
          <option value="">All statuses</option>
          {(
            [
              "verified",
              "needs_review",
              "unverified",
            ] as RequirementVerificationStatus[]
          ).map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
        <select
          value={visibility}
          onChange={(e) => setVisibility(e.target.value)}
          className="h-10 rounded-lg border bg-card px-2 text-xs"
        >
          <option value="">All visibility</option>
          {(["visible", "review", "hidden"] as CandidateVisibility[]).map(
            (x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ),
          )}
        </select>
        <select
          value={ai}
          onChange={(e) => setAi(e.target.value)}
          className="h-10 rounded-lg border bg-card px-2 text-xs"
        >
          <option value="">AI all</option>
          <option value="enabled">AI enabled</option>
          <option value="disabled">AI disabled</option>
        </select>
      </div>
      {items.map((item) => (
        <article key={item.id} className="rounded-xl border bg-card p-3">
          <b className="text-sm">
            {airlineById.get(item.airlineId)?.name} · {item.category}
          </b>
          <p className="mt-1 text-sm">{item.requirement}</p>
          {item.description && (
            <p className="mt-1 text-xs text-muted-foreground">
              {item.description}
            </p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            Grade {item.sourceGrade} · {item.confidence} ·{" "}
            {item.sourceReference.length} source(s)
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <select
              value={item.verificationStatus}
              onChange={(e) => {
                const next = e.target.value as RequirementVerificationStatus;
                onChange(item.id, {
                  verificationStatus: next,
                  aiContextEnabled:
                    next === "verified" ? item.aiContextEnabled : false,
                });
              }}
              className="h-9 rounded-lg border bg-card px-1 text-xs"
            >
              {(
                [
                  "verified",
                  "needs_review",
                  "unverified",
                ] as RequirementVerificationStatus[]
              ).map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
            <select
              value={item.candidateVisibility}
              onChange={(e) =>
                onChange(item.id, {
                  candidateVisibility: e.target.value as CandidateVisibility,
                  aiContextEnabled:
                    e.target.value === "visible"
                      ? item.aiContextEnabled
                      : false,
                })
              }
              className="h-9 rounded-lg border bg-card px-1 text-xs"
            >
              {(["visible", "review", "hidden"] as CandidateVisibility[]).map(
                (x) => (
                  <option key={x}>{x}</option>
                ),
              )}
            </select>
            <button
              onClick={() => updateAi(item, !item.aiContextEnabled)}
              disabled={
                !item.aiContextEnabled &&
                (item.verificationStatus !== "verified" ||
                  !item.sourceReference.length)
              }
              className="rounded-lg border text-xs disabled:opacity-40"
            >
              AI: {item.aiContextEnabled ? "Enabled" : "Disabled"}
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}

function ResearchImportPanel({
  onBack,
  onImported,
}: {
  onBack: () => void;
  onImported: () => void;
}) {
  const [form, setForm] = useState<AirlineResearchImportPayload>({
    airlineId: "emirates",
    title: "",
    sourceUrl: "",
    sourceTitle: "",
    sourceDate: "",
    sourceGrade: undefined,
    rawText: "",
    collectedBy: "perplexity",
    notes: "",
  });
  const [error, setError] = useState("");
  const update = (key: keyof AirlineResearchImportPayload, value: unknown) =>
    setForm(
      (current) =>
        ({ ...current, [key]: value }) as AirlineResearchImportPayload,
    );
  const submit = (event: FormEvent) => {
    event.preventDefault();
    try {
      airlineResearchRepository.create(createResearchRecordFromImport(form));
      onImported();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not save the import.",
      );
    }
  };
  return (
    <div className="flex h-full flex-col bg-background">
      <header className="flex items-center gap-3 border-b p-4">
        <button aria-label="Back to admin" onClick={onBack}>
          <ChevronLeft />
        </button>
        <div>
          <h1 className="font-bold">Research import</h1>
          <p className="text-xs text-muted-foreground">
            Saved as collected; never published or transformed automatically.
          </p>
        </div>
      </header>
      <form onSubmit={submit} className="flex-1 space-y-4 overflow-y-auto p-4">
        <label className="block text-sm font-medium">
          Airline
          <select
            value={form.airlineId}
            onChange={(event) => update("airlineId", event.target.value)}
            className="mt-1 h-11 w-full rounded-xl border bg-card px-3"
          >
            {airlineMaster.map((airline) => (
              <option key={airline.id} value={airline.id}>
                {airline.name}
              </option>
            ))}
          </select>
        </label>
        <Field
          label="Title"
          value={form.title}
          onChange={(value) => update("title", value)}
        />
        <Field
          label="Source URL"
          value={form.sourceUrl}
          onChange={(value) => update("sourceUrl", value)}
        />
        <Field
          label="Source title"
          value={form.sourceTitle}
          onChange={(value) => update("sourceTitle", value)}
        />
        <Field
          label="Source date"
          value={form.sourceDate ?? ""}
          type="date"
          onChange={(value) => update("sourceDate", value)}
        />
        <label className="block text-sm font-medium">
          Source grade
          <select
            value={form.sourceGrade ?? ""}
            onChange={(event) =>
              update("sourceGrade", event.target.value || undefined)
            }
            className="mt-1 h-11 w-full rounded-xl border bg-card px-3"
          >
            <option value="">Unassigned</option>
            {["A", "B", "C", "D", "E"].map((grade) => (
              <option key={grade} value={grade}>
                {grade}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          Research text
          <textarea
            required
            value={form.rawText}
            onChange={(event) => update("rawText", event.target.value)}
            className="mt-1 min-h-40 w-full rounded-xl border bg-card p-3"
          />
        </label>
        <label className="block text-sm font-medium">
          Notes
          <textarea
            value={form.notes ?? ""}
            onChange={(event) => update("notes", event.target.value)}
            className="mt-1 min-h-20 w-full rounded-xl border bg-card p-3"
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-coral">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="submit"
            className="h-11 flex-1 rounded-xl border font-bold text-navy"
          >
            Save
          </button>
          <button
            type="submit"
            className="h-11 flex-1 rounded-xl bg-navy font-bold text-ivory"
          >
            Register for review
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        required={label !== "Source date"}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-11 w-full rounded-xl border bg-card px-3"
      />
    </label>
  );
}
function Metric({
  name,
  value,
  raw = false,
}: {
  name: string;
  value: number;
  raw?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{name}</p>
      <b className="text-xl">
        {value}
        {raw ? "" : "%"}
      </b>
    </div>
  );
}
function ResearchQueue({
  records,
  onStatus,
}: {
  records: AirlineResearchRecord[];
  onStatus: (
    id: string,
    status: "approved" | "rejected" | "reviewing" | "processing",
  ) => void;
}) {
  if (!records.length)
    return (
      <p className="rounded-xl bg-secondary/60 p-4 text-sm">
        No research records yet. Raw research never publishes automatically.
      </p>
    );
  return (
    <section className="space-y-3">
      {records.map((record) => (
        <article key={record.id} className="rounded-xl border bg-card p-4">
          <b className="text-sm">{record.sourceTitle}</b>
          <p className="mt-1 text-xs text-muted-foreground">
            {record.sourceType} · {record.collectedAt.slice(0, 10)} ·{" "}
            {record.confidence} · {record.status}
          </p>
          <p className="mt-2 break-all text-xs text-muted-foreground">
            {record.sourceUrl}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className="rounded-lg border px-3 py-2 text-xs"
              onClick={() => onStatus(record.id, "processing")}
            >
              Process
            </button>
            <button
              className="rounded-lg border px-3 py-2 text-xs"
              onClick={() => onStatus(record.id, "reviewing")}
            >
              Review
            </button>
            <button
              className="rounded-lg bg-navy px-3 py-2 text-xs text-ivory"
              onClick={() => onStatus(record.id, "approved")}
            >
              Approve
            </button>
            <button
              className="rounded-lg border px-3 py-2 text-xs text-coral"
              onClick={() => onStatus(record.id, "rejected")}
            >
              Reject
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}
function CoachingInsightQueue({
  insights,
  onStatus,
}: {
  insights: AirlineCoachingInsight[];
  onStatus: (id: string, status: "draft" | "reviewing" | "approved") => void;
}) {
  if (!insights.length)
    return (
      <p className="rounded-xl bg-secondary/60 p-4 text-sm">
        No coaching insights yet. Source-backed drafts must be reviewed before
        AI can use them.
      </p>
    );
  return (
    <section className="space-y-3">
      {insights.map((insight) => (
        <article key={insight.id} className="rounded-xl border bg-card p-4">
          <b className="text-sm">{insight.topic}</b>
          <p className="mt-1 text-xs text-muted-foreground">
            {insight.status} · {insight.sourceReferences.length} sources
          </p>
          <p className="mt-2 text-sm">{insight.coachMessage}</p>
          <div className="mt-3 flex gap-2">
            <button
              className="rounded-lg border px-3 py-2 text-xs"
              onClick={() => onStatus(insight.id, "reviewing")}
            >
              Review
            </button>
            <button
              className="rounded-lg bg-navy px-3 py-2 text-xs text-ivory"
              onClick={() => onStatus(insight.id, "approved")}
            >
              Approve
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}
function EmiratesReviewPanel() {
  const [version, setVersion] = useState(0);
  const entities: ReviewEntity[] = [
    {
      id: "emirates-profile-review",
      airlineId: "emirates",
      type: "profile",
      title: "Emirates Profile",
      sourceReferences: [emiratesResearchRecords[0].sourceUrl],
      sourceGrades: ["A"],
      confidence: "high",
      createdAt: emiratesResearchRecords[0].collectedAt,
    },
    {
      id: "emirates-recruitment-review",
      airlineId: "emirates",
      type: "recruitment",
      title: "Emirates Recruitment",
      sourceReferences: emiratesResearchRecords.flatMap((record) =>
        record.extractedFacts
          .filter((fact) => fact.category === "recruitment")
          .map((fact) => fact.sourceUrl)
          .filter((url): url is string => !!url),
      ),
      sourceGrades: emiratesResearchRecords.flatMap((record) =>
        record.extractedFacts
          .filter((fact) => fact.category === "recruitment")
          .map((fact) => fact.sourceGrade)
          .filter((grade): grade is "A" | "B" | "C" | "D" | "E" => !!grade),
      ),
      confidence: "high",
      createdAt: emiratesResearchRecords[1].collectedAt,
    },
    ...emiratesFaqDrafts.map((item) => ({
      id: item.id,
      airlineId: item.airlineId,
      type: "faq" as const,
      title: item.question,
      sourceReferences: item.sourceReference ? [item.sourceReference] : [],
      sourceGrades: [item.sourceGrade],
      createdAt: item.createdAt,
    })),
    ...emiratesInterviewQuestionDrafts.map((item) => ({
      id: item.id,
      airlineId: item.airlineId,
      type: "interview" as const,
      title: item.prompt,
      sourceReferences: item.sourceReferences,
      sourceGrades: ["C" as const],
      createdAt: "2026-07-27T00:00:00.000Z",
    })),
    ...emiratesCoachingInsightDrafts.map((item) => ({
      id: item.id,
      airlineId: item.airlineId,
      type: "coaching" as const,
      title: item.topic,
      sourceReferences: item.sourceReferences,
      sourceGrades: ["A" as const],
      createdAt: "2026-07-27T00:00:00.000Z",
    })),
  ];
  const act = (entity: ReviewEntity, status: ReviewStatus) => {
    airlineReviewWorkflow.setStatus(entity.id, status);
    setVersion((value) => value + 1);
  };
  const publish = (entity: ReviewEntity) => {
    airlineReviewWorkflow.publish(entity.id, entity);
    setVersion((value) => value + 1);
  };
  return (
    <section key={version} className="space-y-3">
      <p className="rounded-xl bg-secondary/60 p-4 text-xs">
        Approved and published are separate. Only published records can enter AI
        Context.
      </p>
      {(
        ["profile", "recruitment", "faq", "interview", "coaching"] as const
      ).map((type) => (
        <div key={type} className="space-y-2">
          <h2 className="font-bold">{type}</h2>
          {entities
            .filter((entity) => entity.type === type)
            .map((entity) => (
              <ReviewRow
                key={entity.id}
                entity={entity}
                state={airlineReviewWorkflow.get(entity.id)}
                onStatus={(status) => act(entity, status)}
                onPublish={() => publish(entity)}
              />
            ))}
        </div>
      ))}
      <div>
        <h2 className="font-bold">sources</h2>
        {emiratesResearchRecords.map((record) => (
          <p
            key={record.id}
            className="mt-2 rounded-xl border bg-card p-3 text-xs"
          >
            <b>{record.sourceTitle}</b>
            <br />
            {record.sourceUrl}
            <br />
            Grade {record.sourceGrade ?? "unassigned"} · checked{" "}
            {record.sourceDate ?? record.collectedAt.slice(0, 10)} · research
            records using source: {record.extractedFacts.length}
          </p>
        ))}
      </div>
    </section>
  );
}
function ReviewRow({
  entity,
  state,
  onStatus,
  onPublish,
}: {
  entity: ReviewEntity;
  state: { status: ReviewStatus; publishStatus: "unpublished" | "published" };
  onStatus: (status: ReviewStatus) => void;
  onPublish: () => void;
}) {
  const approvable = canApprove(entity);
  return (
    <article className="rounded-xl border bg-card p-3">
      <p className="text-sm">{entity.title}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {state.status} · {state.publishStatus} ·{" "}
        {entity.sourceReferences.length} source(s) ·{" "}
        {entity.sourceGrades.join(", ") || "none"}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          disabled={!approvable}
          onClick={() => onStatus("approved")}
          className="rounded-lg bg-navy px-2 py-1 text-xs text-ivory disabled:opacity-40"
        >
          Approve
        </button>
        <button
          onClick={() => onStatus("reviewing")}
          className="rounded-lg border px-2 py-1 text-xs"
        >
          Reviewing
        </button>
        <button
          onClick={() => onStatus("needs_revision")}
          className="rounded-lg border px-2 py-1 text-xs"
        >
          Needs revision
        </button>
        <button
          onClick={() => onStatus("rejected")}
          className="rounded-lg border px-2 py-1 text-xs text-coral"
        >
          Reject
        </button>
        <button
          disabled={state.status !== "approved" || !approvable}
          onClick={onPublish}
          className="rounded-lg border px-2 py-1 text-xs disabled:opacity-40"
        >
          Publish
        </button>
      </div>
    </article>
  );
}
