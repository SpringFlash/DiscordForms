# Quiz Mode Design

## Summary

Add a graded quiz mode to DiscordForms for faction admission tests. Correct answers, passing
threshold and the Discord webhook URL are sealed with AES-GCM by a free Cloudflare Worker and
never reach the browser. The worker decrypts, grades the submission, posts the result to Discord
and returns only what the form author allows the candidate to see.

## Decisions

| Decision | Choice |
|----------|--------|
| Anti-cheat model | Answer key never present in client; sealed server-side blob |
| Backend | Cloudflare Worker, free tier, stateless (no KV, no DB) |
| Hosting | GitHub Pages stays as-is |
| Webhook hiding | Quiz forms only; regular forms keep sending directly to Discord |
| Gradable field types | `radio`, `select`, `checkboxes` (exact match, no partial credit) |
| Non-gradable types | `textarea` and the rest — sent to Discord for manual review |
| Result visibility | Configurable: `none` / `score` / `full`, default `score` |
| Attempt mechanics | Question shuffle + pick N of pool + browser timer |
| Attempt limit | Out of scope; mitigated by worker rate limiting |
| Answer key storage (authoring) | `localStorage` + JSON export, never in the URL |

## Threat Model

Two distinct problems, only one of which is solvable here.

**Solved: answer key leakage.** The candidate cannot read correct answers from the link, the
page source, or network traffic. Grading happens exclusively inside the worker with a key held
in worker secrets.

**Not solved: the candidate looking things up.** Nothing in a browser form prevents reading the
wiki or asking a friend. Mitigated organizationally: timer, question pool randomization, and an
open-ended question reviewed by a moderator.

**Additionally closed:** webhook theft. Today `config.webhookUrl` and
`field.customWebhook.url` travel in the shared link in plain text, giving anyone who opens a
form a permanent, unrevokable posting key to the Discord channel. For quiz forms the webhook
moves into the sealed blob. Rotating `SEAL_KEY` invalidates every previously issued blob without
recreating the webhook.

**Residual risk:** someone can replay a sealed blob against `/submit` with junk answers. Bounded
by per-IP rate limiting on `/submit`; every attempt is visible to moderators in Discord.

## Data Model

### Public config (travels in the URL, not secret)

```ts
export type ResultVisibility = 'none' | 'score' | 'full'

export interface QuizConfig {
  enabled: boolean
  questionCount: number     // 0 = all questions, N = pick N from the pool
  shuffleQuestions: boolean
  timeLimitSeconds: number   // 0 = no timer
  sealedBlob: string         // 's1:<base64url>', empty while authoring
}
```

`FormConfig` gains `quiz: QuizConfig | null`.

`FormField` gains `correctAnswers: string[]` — used **only** in the editor and stripped by
`optimizeConfig` before encoding, so it can never reach a shared link.

### Sealed payload (worker-side only)

```ts
interface SealedPayload {
  webhookUrl: string
  passingScore: number
  questionCount: number
  resultVisibility: ResultVisibility
  answers: Record<string, string[]>   // fieldId -> correct effective values
}
```

`questionCount` is duplicated deliberately: the public copy drives rendering, the sealed copy
lets the worker reject a client claiming "I was served one question, I got it right, 1/1, pass".

`passingScore` and `resultVisibility` are sealed because both are tamper-sensitive — a candidate
editing their own link must not be able to lower the threshold or unlock the full review.

### Effective option values

`SelectField`, `RadioField` and `CheckboxesField` all submit `option.value || option.label`.
The answer key stores the same effective value. `checkboxes` submits selected values joined by
`\n`.

## Authoring Flow

The answer key must never be encoded into any URL. `updateConfig()` writes the whole config into
the address bar on every keystroke and `getShareUrl()` reuses that config, so anything living in
`FormConfig` leaks by construction.

1. Author marks correct answers per field and sets quiz settings in the editor.
2. `correctAnswers` is held in the store and persisted to `localStorage` under the form draft.
   `optimizeConfig` deletes it from the encoded config.
3. On "Generate link": the editor POSTs the answer key, threshold, visibility and webhook URL to
   `POST /seal`, receives `sealedBlob`, writes it into `quiz.sealedBlob`, and only then builds
   the share URL.
4. If the worker is unreachable, the editor surfaces an explicit error and produces no link.

Consequence: clearing browser storage loses the answer key. JSON export becomes mandatory rather
than optional, and the editor states this next to the quiz section. `exportConfig` includes
`correctAnswers` and quiz settings; `stripWebhooks` behaviour for `webhookUrl` is unchanged.

## Worker

Directory `worker/`, deployed with `wrangler`. Imports `createDiscordEmbeds` and
`createPlainTextMessage` from `src/services/discord.ts` — they are pure and DOM-free, so Discord
formatting stays in one place.

Secrets and bindings:

| Name | Purpose |
|------|---------|
| `SEAL_KEY` | base64 32-byte AES-GCM key |
| `AUTHOR_TOKEN` | shared secret gating `/seal` |
| rate limiter binding | per-IP limit on `/submit` |

Client reads the worker origin from `VITE_WORKER_URL` at build time.

### `POST /seal`

Requires `Authorization: Bearer <AUTHOR_TOKEN>`; without it the worker would be a public
encryption oracle. Body is a `SealedPayload`. Returns `{ blob: string }` where
`blob = 's1:' + base64url(iv ‖ ciphertext)`, 12-byte random IV.

### `POST /submit`

```ts
{
  blob: string
  servedFieldIds: string[]
  answers: Record<string, string>
  formTitle: string
  meta: { elapsedSeconds: number, timedOut: boolean }
}
```

1. Decrypt `blob`. Failure (rotated key, corrupted link) → `410`, nothing is posted.
2. Validate `servedFieldIds`: every id must exist in the answer key, and the count must equal
   `questionCount` (or the full key size when `questionCount` is 0). Mismatch → `400`, nothing
   is posted.
3. Grade each served question: `new Set(answer.split('\n'))` against `new Set(key[fieldId])`,
   equal size and identical members. One point or zero; no weights, no partial credit.
4. `passed = score >= passingScore`.
5. Build the Discord message from the existing formatters, prepend a result block
   (`score / total`, threshold, verdict) and append the list of failed question labels. Embed
   colour is green or red by verdict, from a dedicated constant — `PRIORITY_COLORS` is untouched.
6. POST to the decrypted webhook URL.
7. Respond by `resultVisibility`: `none` → `{ ok: true }`; `score` →
   `{ score, total, passed }`; `full` → additionally the per-question breakdown.

Trimming happens in the worker, not the browser — a client-side filter would be readable in the
network tab. Moderators always receive the full breakdown in Discord regardless of the setting.

Non-gradable answers are excluded from scoring and included in the Discord message flagged for
manual review.

## Taking a Quiz

- Pool selection and shuffle run once on load, before the first render.
- The timer runs in the browser and is shown in the form header. On zero the form auto-submits
  whatever is filled with `meta.timedOut = true`. A client-side clock is defeatable by devtools;
  it exists to discourage casual look-ups, and the design does not claim more.
- The result screen renders according to what the worker returned.
- Reloading yields a fresh selection. Attempt limits were deliberately dropped: `localStorage`
  is bypassed by incognito and IP counting punishes shared connections. Rate limiting plus
  moderator visibility of repeat submissions covers it.
- Quiz forms submit to the worker instead of Discord. Non-quiz forms keep the current path.

## Components

| File | Change |
|------|--------|
| `src/types/index.ts` | `QuizConfig`, `ResultVisibility`, `SealedPayload`, field/config additions |
| `src/services/config.ts` | strip `correctAnswers` in `optimizeConfig`; migrate configs without `quiz` |
| `src/services/quiz.ts` | new: seal request, submit request, worker error mapping |
| `src/services/grading.ts` | new: shared exact-match grading, imported by worker and tests |
| `src/stores/formConfig.ts` | answer key state, `localStorage` persistence, async share-URL path |
| `src/composables/useQuizAttempt.ts` | new: pool selection, shuffle, timer, auto-submit |
| `src/components/editor/FormSettings.vue` | quiz section; warning on `full` visibility |
| `src/components/editor/QuizAnswersEditor.vue` | new: correct-answer picker over existing options |
| `src/components/editor/FieldEditor.vue` | mount the answer picker for gradable types |
| `src/components/editor/WorkerSettings.vue` | new: worker URL and author token panel |
| `src/components/form/FormView.vue` | quiz submit path, timer header, result screen |
| `src/components/form/QuizResult.vue` | new: result screen per visibility level |
| `worker/` | new: `seal.ts`, `submit.ts`, `index.ts`, `wrangler.toml` |

`FormSettings.vue` (126 lines) and `FieldEditor.vue` (300 lines) both grow, so the quiz-specific
UI lands in its own components rather than inflating them further.

## Testing

The project currently has no test infrastructure. Add `vitest` and cover the two modules where a
silent bug is unacceptable:

**`grading.ts`** — exact match; `checkboxes` order independence; extra selection fails; missing
selection fails; empty answer scores zero; unknown `servedFieldIds` rejected; wrong
`servedFieldIds` count rejected; `questionCount: 0` grades the whole key.

**`seal.ts`** — encrypt/decrypt roundtrip; decryption fails under a different `SEAL_KEY`;
decryption fails on a tampered ciphertext; malformed prefix rejected.

Components are not covered.

## Out of Scope

- `text` answer grading (needs normalization and synonym lists)
- Partial credit for `checkboxes`
- Per-question weights
- Attempt limits and any server-side state
- Turnstile / captcha
- Hiding webhooks for non-quiz forms
- Server-authoritative timer
