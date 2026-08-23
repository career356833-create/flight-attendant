# AI Interviewer V1 QA

Static/build validation passed; click-based browser E2E remains pending.

1. Start Quick 5 in **AI 면접관** mode and verify basic progress remains `1 / 5` when a follow-up is shown.
2. Give a complete STAR answer: no follow-up should be offered.
3. Omit the result: verify the deterministic result template is shown.
4. Give a generic answer: verify a specificity template is shown.
5. Use a safety answer without a clear priority: verify a safety-first template is selected.
6. Answer the follow-up and verify it is saved as a child of the base attempt; skip one and verify the base session advances.
7. Verify the session limit: Quick 3, Standard 4, Deep 6 maximum follow-ups.
8. Confirm a repeated template is not used consecutively and a base question gets at most one V1 follow-up.
9. Verify no AI provider / phrasing failure still shows the original template.
10. Verify airline context uses only published context; unpublished, draft, review, raw, and third-party material are absent.
11. Resume an in-progress session and open the final report. Confirm the follow-up summary is present only when applicable.
12. Check 390px mobile layout, standard desktop layout, legacy optional follow-up, and existing single-question practice.
13. Inspect the browser console for errors; do not log transcript, identity, or provider secrets.
