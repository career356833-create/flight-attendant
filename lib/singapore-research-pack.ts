import type { AirlineFAQ, AirlineKnowledgeProfile } from "./airline-knowledge-repository";
import type { AirlineResearchRecord } from "./airline-research-repository";
import type { AirlineCoachingInsight, AirlineInterviewQuestion } from "./airline-knowledge-transformer";

const careers = "https://www.singaporeair.com/ko_KR/kr/careers/";
const cabinCrew = "https://www.singaporeair.com/ko_KR/kr/careers/cabin-crew-career/";
const bePartOfSia = "https://www.singaporeair.com/en_UK/sg/careers/be-part-of-sia/";
const airPortal = "https://www.airportal.go.kr:450/airworks/board.es?mid=a10200000000&bid=0016&act=view&list_no=3411&nPage=1&retUrl=blist";
const collectedAt = "2026-07-27T00:00:00.000Z";
const fact = (category: AirlineResearchRecord["extractedFacts"][number]["category"], key: string, value: string, sourceUrl: string, sourceGrade: "A" | "C" | "E") => ({ category, key, value, sourceUrl, sourceGrade, verified: false });

/** Transcribed only from the supplied Singapore Airlines research pack. No fact is verified or publishable at this stage. */
export const singaporeResearchRecords: AirlineResearchRecord[] = [
  {
    id: "singapore-profile-20260727", airlineId: "singapore_airlines", sourceTitle: "Singapore Airlines careers pages", sourceUrl: careers, sourceType: "Company Profile", collectedBy: "manual", collectedAt, sourceDate: "2026-07-27", sourceGrade: "A", confidence: "high", status: "collected",
    rawSummary: "Supplied Singapore Airlines profile and source table.", rawText: "Singapore Airlines; Singapore; world-leading airline; careers and cabin crew careers pages.",
    extractedFacts: [
      fact("profile", "official_name", "Singapore Airlines", cabinCrew, "A"),
      fact("profile", "country", "Singapore", careers, "A"),
      fact("brand", "brand_value", "World-leading airline and reasons to join SIA.", bePartOfSia, "A"),
      fact("service", "customer_focus", "Candidate-facing careers material highlights customer-facing experience.", bePartOfSia, "A"),
      fact("profile", "headquarters", "Requires confirmation.", careers, "E"),
      fact("profile", "hub", "Requires confirmation.", careers, "E"),
      fact("profile", "establishment", "Requires confirmation.", careers, "E"),
    ],
  },
  {
    id: "singapore-recruitment-20260727", airlineId: "singapore_airlines", sourceTitle: "Supplied Singapore Airlines recruitment material", sourceUrl: airPortal, sourceType: "Recruitment Data", collectedBy: "manual", collectedAt, sourceDate: "2026-07-27", sourceGrade: "C", confidence: "high", status: "collected",
    rawSummary: "Supplied recruitment criteria and public recruitment-process material.", rawText: "English communication, recognised university degree, relocation to Singapore, minimum height, service orientation, video interview and final interview material.",
    extractedFacts: [
      fact("recruitment", "official_career_page", "Singapore Airlines Cabin Crew Careers page.", cabinCrew, "A"),
      fact("language", "english", "Fluent in English with good communication skills.", airPortal, "C"),
      fact("recruitment", "education", "Recognised university / Bachelor's Degree.", airPortal, "C"),
      fact("recruitment", "relocation", "Relocate to Singapore.", airPortal, "C"),
      fact("recruitment", "minimum_height", "At least 1.58m for females and 1.65m for males.", airPortal, "C"),
      fact("service", "service_attributes", "Service-oriented and pleasant personality.", airPortal, "C"),
      fact("interview", "online_assessment", "Video interview online is indicated in public recruitment material.", airPortal, "C"),
      fact("interview", "final_interview", "Shortlisted candidates are invited to final interviews.", airPortal, "C"),
      fact("recruitment", "grooming_policy", "Requires confirmation.", cabinCrew, "E"),
      fact("recruitment", "medical", "Requires confirmation.", cabinCrew, "E"),
      fact("recruitment", "training", "Requires confirmation.", cabinCrew, "E"),
    ],
  },
  {
    id: "singapore-preparation-20260727", airlineId: "singapore_airlines", sourceTitle: "Supplied Singapore Airlines preparation candidates", sourceUrl: bePartOfSia, sourceType: "Interview Preparation and Application Coaching", collectedBy: "manual", collectedAt, sourceDate: "2026-07-27", sourceGrade: "C", confidence: "medium", status: "collected",
    rawSummary: "Supplied support prompts and coaching directions; not actual interview questions.", rawText: "Preparation prompts for motivation, service, teamwork, safety, English, and multicultural communication. Connect service orientation, refined customer experience, multicultural communication, and safety awareness. Avoid image-only, overseas-life-only, and value-free applications.",
    extractedFacts: [
      fact("interview", "question_patterns", "Support prompts for motivation, service, teamwork, safety, language, and multicultural communication.", bePartOfSia, "C"),
      fact("application", "motivation_direction", "Connect service orientation and customer experience to selected evidence.", bePartOfSia, "A"),
      fact("application", "avoid_pattern", "Do not rely on image-only, overseas-life-only, or value-free motivation.", airPortal, "C"),
    ],
  },
  {
    id: "singapore-needs-review-20260727", airlineId: "singapore_airlines", sourceTitle: "Supplied Singapore Airlines items requiring confirmation", sourceUrl: cabinCrew, sourceType: "Needs review", collectedBy: "manual", collectedAt, sourceDate: "2026-07-27", sourceGrade: "E", confidence: "low", status: "collected",
    rawSummary: "HQ, hub, establishment, grooming, medical, training, and country-specific details require confirmation.", rawText: "Needs review only; not suitable for candidate-facing AI context.",
    extractedFacts: [fact("profile", "official_hq", "Requires confirmation.", cabinCrew, "E"), fact("profile", "official_hub", "Requires confirmation.", cabinCrew, "E"), fact("profile", "establishment", "Requires confirmation.", cabinCrew, "E")],
  },
];

export const singaporeKnowledgeProfileCandidate: Partial<AirlineKnowledgeProfile> = {
  id: "profile-singapore-airlines", airlineId: "singapore_airlines", reviewStatus: "approved", publishStatus: "published",
  overview: { officialName: "Singapore Airlines", displayName: "Singapore Airlines", countryCode: "SG", region: "asia_pacific", businessModel: "full_service", website: careers, brandIdentity: { value: "World-leading airline and reasons to join SIA.", status: "needs_review", sourceIds: ["singapore-profile-20260727"] }, customerFocus: { value: "Candidate-facing careers material highlights customer-facing experience.", status: "needs_review", sourceIds: ["singapore-profile-20260727"] }, servicePhilosophy: "Service-oriented, pleasant personality, and customer-facing excellence are candidate review material from the supplied C-grade source.", safetyCulture: { value: "Minimum-height material is linked to safety and operational readiness in the supplied C-grade source.", status: "needs_review", sourceIds: ["singapore-recruitment-20260727"] } } as AirlineKnowledgeProfile["overview"],
  recruitmentProfile: { recruitmentLanguages: ["English"], applicationLanguages: ["English"], commonRecruitmentStages: ["application", "video_interview", "individual_interview"], officialCareerPageUrl: cabinCrew, currentStatus: "unknown", checkedAt: "2026-07-27", eligibilityRequirements: { value: ["Recognised university / Bachelor's Degree.", "Relocate to Singapore.", "At least 1.58m for females and 1.65m for males."], status: "needs_review", sourceIds: ["singapore-recruitment-20260727"] }, languageRequirements: { value: ["Fluent in English with good communication skills."], status: "needs_review", sourceIds: ["singapore-recruitment-20260727"] }, selectionSteps: { status: "needs_review", sourceIds: ["singapore-recruitment-20260727"] }, physicalRequirements: { status: "needs_review", sourceIds: ["singapore-recruitment-20260727"] }, status: "draft" },
};

const faq = (id: string, question: string, answer: string, grade: "A" | "C" | "E", sourceReference: string): AirlineFAQ => ({ id, airlineId: "singapore_airlines", category: "eligibility", question: `지원 준비 참고 FAQ: ${question}`, answer, sourceGrade: grade, sourceReference, status: "draft", publishStatus: "unpublished", createdAt: collectedAt, updatedAt: collectedAt });
export const singaporeFaqDrafts: AirlineFAQ[] = [
  faq("singapore-faq-apply", "Where do I apply?", "Use the official Singapore Airlines careers page to check current opportunities.", "A", careers),
  faq("singapore-faq-requirements", "What requirements should I verify?", "The supplied public material lists English communication, degree, minimum height, and relocation; confirm the current vacancy before applying.", "C", airPortal),
  faq("singapore-faq-assessment", "Is there an online assessment?", "The supplied public recruitment material indicates a video interview online; confirm the current vacancy for details.", "C", airPortal),
  faq("singapore-faq-process", "Is the full process publicly confirmed?", "Medical and training stages require confirmation from the current official vacancy.", "E", cabinCrew),
  faq("singapore-faq-fit", "What preparation direction is suggested?", "The supplied material points to service orientation, pleasant customer care, and English communication.", "C", airPortal),
];

const question = (id: string, prompt: string, questionType: AirlineInterviewQuestion["questionType"], competencyTags: string[], recommendedExperienceTags: string[]): AirlineInterviewQuestion => ({ id, airlineId: "singapore_airlines", prompt: `지원 준비용 예상 질문: ${prompt}`, questionType, competencyTags, recommendedExperienceTags, followUpQuestions: [], sourceReferences: [bePartOfSia], status: "draft", publishStatus: "unpublished" });
export const singaporeInterviewQuestionDrafts: AirlineInterviewQuestion[] = [
  question("singapore-q-motivation", "Why Singapore Airlines?", "motivation", ["brand_understanding", "service_orientation", "long_term_commitment"], ["airline_research", "premium_service", "global_career"]),
  question("singapore-q-cabin", "Why do you want to become cabin crew?", "motivation", ["guest_care", "resilience", "service_mindset"], ["hospitality", "customer_support", "communication"]),
  question("singapore-q-service", "Tell me about a time you resolved a difficult customer complaint.", "service", ["empathy", "de_escalation", "problem_solving"], ["complaint_handling", "service_recovery", "frontline_support"]),
  question("singapore-q-teamwork", "Tell me about a time you worked effectively with a team under pressure.", "experience", ["collaboration", "prioritization", "communication"], ["shift_work", "project_coordination", "crisis_support"]),
  question("singapore-q-safety", "What would you do if you noticed a safety risk during service?", "safety", ["situational_judgment", "procedure_compliance", "calmness"], ["risk_reporting", "policy_adherence", "incident_awareness"]),
  question("singapore-q-safety-balance", "How do you balance service and safety?", "safety", ["judgment", "compliance", "service_prioritization"], ["service_recovery", "rule_following", "risk_management"]),
  question("singapore-q-english", "Please introduce yourself in English.", "language", ["spoken_english", "structure", "clarity"], ["self_introduction", "career_summary", "service_example"]),
  question("singapore-q-english-service", "How would you handle a customer complaint in English?", "language", ["service_language", "conflict_resolution", "clarity"], ["guest_handling", "apology", "escalation"]),
  question("singapore-q-culture", "How do you adapt your communication for customers from different cultures?", "experience", ["cultural_awareness", "adaptability", "respect"], ["multicultural_team", "overseas_experience", "diverse_customer_service"]),
];

export const singaporeCoachingInsightDrafts: AirlineCoachingInsight[] = [{ id: "singapore-insight-motivation", airlineId: "singapore_airlines", topic: "motivation", coachMessage: "Singapore Airlines 지원 동기는 서비스 지향성, 고객 경험, 다문화 커뮤니케이션, 안전 인식을 선택한 경험과 연결하도록 안내합니다.", goodDirections: ["service-oriented mindset", "refined customer experience", "multicultural communication", "safety awareness"], avoidPatterns: ["이미지나 외형만 강조", "해외생활만 강조", "서비스 가치 없는 지원"], recommendedExperienceTags: ["customer_service", "teamwork", "multicultural_experience", "safety_awareness"], sourceReferences: [bePartOfSia, airPortal], status: "draft", publishStatus: "unpublished" }];
