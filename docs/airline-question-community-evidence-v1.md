# Airline Question Community Evidence V1

## Scope

Questions keep the existing provenance taxonomy: `OFFICIAL_CURRENT`, `OFFICIAL_ARCHIVE`, `USER_REPORTED`, `VERIFIED_SECONDARY`, and `UNVERIFIED_COMMUNITY`. Official, user-reported, and verified-secondary pattern pools are calculated separately. No LLM is used for classification or clustering.

## Local-first report lifecycle

1. A user selects interview or application, enters the question and optional year/period/language/stage.
2. The user must attest that the question came from their own application or interview experience.
3. Input is normalized and checked for empty/overlong text, URLs, script tags, common contact/identity data, and normalized duplicates.
4. A valid report is stored locally as `USER_REPORTED` + `PENDING` + `verified: false`.
5. Pending reports are visible only to the local owner. They are not practice-eligible and are never presented as official.
6. `ACCEPTED` reports may enter practice and user-pattern analysis. Public sharing is intentionally disabled until an authenticated moderation backend exists.

Moderation states are `PENDING`, `ACCEPTED`, `REJECTED`, `DUPLICATE`, and `NEEDS_REVIEW`.

## Evidence and privacy boundaries

- Public projections remove the anonymous local reporter key and owner marker.
- User ID, email, name, contact details, private applications, and profile demographics are not part of shared evidence.
- Verified secondary evidence requires HTTPS URL, title, publisher, and verification time; publication time is optional.
- Official duplicates remain the displayed primary record. User and secondary occurrences are preserved as supporting evidence instead of being deleted.
- No Supabase table, migration, upload queue, or public community endpoint is introduced in V1.

## Pattern thresholds

- 1–2 samples: `INSUFFICIENT`
- 3–5 samples with at least two distinct reporters: `LIMITED`
- 6+ samples with at least three distinct reporters: `OBSERVED_PATTERN`

A repeated-theme signal additionally requires more than one period and more than one reporter. Reliability is represented with report count, distinct reporter count, observed years, and latest observation. No probability or fabricated confidence percentage is produced.

## Manual QA

- Desktop: open Airline Targeting → airline → Questions; verify grouped provenance filter, report form, 44px controls, three separate pattern panels, and honest empty states.
- Mobile 390px: verify the form stays single-column, no horizontal overflow, and submit remains disabled before attestation.
- Submit a non-sensitive test report only in an isolated browser profile. Verify `검토 대기`, `이 기기에만 저장`, and practice lock.
- Verify an accepted fixture exposes practice actions while pending/rejected fixtures do not.
- Verify official duplicate display priority and supporting occurrence count.
- Verify refresh restores the local report without exposing reporter metadata.

## Deferred

Authenticated submission, reviewer identity, server moderation queues, public publication, audit trails, and Supabase persistence require a separately approved backend phase.
