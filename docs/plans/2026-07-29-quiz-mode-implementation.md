# Quiz Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a graded quiz mode where correct answers, passing threshold and the Discord webhook URL are sealed by a Cloudflare Worker and never reach the candidate's browser.

**Architecture:** The editor marks correct answers locally, then asks the worker to encrypt them into an opaque blob that travels in the share URL. On submit the browser posts the blob plus the candidate's answers to the worker, which decrypts, grades, posts the result to Discord, and returns only what the author allowed the candidate to see. The worker is stateless — no KV, no database.

**Tech Stack:** Vue 3, TypeScript strict, Pinia, Vite, Vitest, Cloudflare Workers (Wrangler), WebCrypto AES-GCM.

**Spec:** `docs/plans/2026-07-29-quiz-mode-design.md`

## Global Constraints

- TypeScript strict mode. No `any`. No non-null assertions on values that can legitimately be absent.
- No comments in code. Not `//`, not `/* */`, not JSDoc. Only functional directives (`eslint-disable`, `@ts-expect-error`) are allowed.
- All code, identifiers, file text and commit messages in English. User-facing UI strings in Russian, matching existing wording style.
- Gradable field types: `radio`, `select`, `checkboxes` only. Exact match, no partial credit, no weights.
- The answer key must never appear in an encoded config string. Any task touching `optimizeConfig` or share-URL generation must keep this true.
- Effective option value is `option.value || option.label` — this is what all three gradable field components submit, and what the answer key stores.
- `checkboxes` serializes selected values joined by `\n`.
- Result trimming by `resultVisibility` happens in the worker, never in the browser.
- Node 22 (`.nvmrc`). Cloudflare Workers free tier only.
- Deployment of the SPA stays on GitHub Pages, unchanged.

## File Structure

| File | Responsibility |
|------|----------------|
| `src/types/index.ts` | `QuizConfig`, `ResultVisibility`, `SealedPayload`, `GradedQuestion`, `GradeResult`, `GradeOutcome`, `QuizSubmitResponse`; `quiz` on `FormConfig`, `correctAnswers` on `FormField` |
| `src/services/grading.ts` | Pure grading: value parsing, exact match, submission validation and scoring |
| `src/services/quizMessage.ts` | Pure Discord result formatting (header block, failed-question list, verdict colour) |
| `src/services/quizPool.ts` | Pure question pool selection and shuffle with injectable RNG |
| `src/services/quiz.ts` | Client-side worker calls: `sealQuiz`, `submitQuiz`, HTTP error mapping |
| `src/services/quizStorage.ts` | `localStorage` persistence of the answer key draft and worker credentials |
| `src/composables/useQuizAttempt.ts` | Attempt state: served fields, countdown, auto-submit trigger |
| `src/components/editor/QuizAnswersEditor.vue` | Correct-answer picker over a field's existing options |
| `src/components/editor/QuizSettings.vue` | Quiz section of the editor sidebar |
| `src/components/editor/WorkerSettings.vue` | Worker URL and author token panel |
| `src/components/form/QuizTimer.vue` | Countdown display in the form header |
| `src/components/form/QuizResult.vue` | Result screen, rendered per visibility level |
| `worker/seal.ts` | AES-GCM seal/unseal of `SealedPayload` |
| `worker/index.ts` | `/seal` and `/submit` handlers, CORS, Discord POST |
| `worker/wrangler.toml` | Worker config, secrets and rate-limit binding |
| `tsconfig.worker.json` | Type config for `worker/` with Cloudflare types |

`src/services/grading.ts`, `quizMessage.ts` and `src/types/index.ts` are shared by the SPA and the worker. Nothing under `worker/` is imported by the SPA.

---

### Task 1: Test infrastructure and quiz types

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Modify: `src/types/index.ts:1-75`
- Modify: `src/services/config.ts:10-44`
- Modify: `src/stores/formConfig.ts:17-34`
- Test: `src/services/config.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `ResultVisibility`, `QuizConfig`, `SealedPayload`, `FormConfig.quiz`, `FormField.correctAnswers`. `optimizeConfig` strips `correctAnswers` and disabled `quiz`. `npm test` runs Vitest.

- [ ] **Step 1: Install Vitest**

```bash
npm install -D vitest@^3
```

- [ ] **Step 2: Add the test script**

In `package.json`, inside `"scripts"`, after `"preview": "vite preview"`:

```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 3: Configure the test environment**

In `vite.config.ts`, add a `test` block to the object passed to `defineConfig`, after `base`:

```ts
  base: '/DiscordForms/',
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'worker/**/*.test.ts'],
  },
```

- [ ] **Step 4: Write the failing test**

Create `src/services/config.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { encodeConfig, decodeConfig, optimizeConfig } from './config'
import type { FormConfig, FormField } from '../types'

function makeField(overrides: Partial<FormField> = {}): FormField {
  return {
    id: 'f1',
    type: 'radio',
    label: 'Question',
    placeholder: '',
    required: true,
    icon: 'question',
    options: [
      { label: 'Yes', value: '' },
      { label: 'No', value: '' },
    ],
    formula: '',
    showTextInResponse: true,
    defaultValue: '',
    maxFiles: 10,
    conditional: null,
    customWebhook: null,
    correctAnswers: ['Yes'],
    ...overrides,
  }
}

function makeConfig(overrides: Partial<FormConfig> = {}): FormConfig {
  return {
    title: 'Test',
    description: '',
    customMessage: '',
    webhookUrl: '',
    webhookUsername: '',
    webhookAvatarUrl: '',
    organization: 'LSPD',
    sendAsPlainText: false,
    displayUsername: true,
    showAdvancedSettings: false,
    sendQuestionNumbers: true,
    sendEmojis: false,
    sendColons: true,
    fields: [makeField()],
    conditionalMessages: [],
    quiz: null,
    ...overrides,
  }
}

describe('optimizeConfig', () => {
  it('strips correctAnswers from every field', () => {
    const optimized = optimizeConfig(makeConfig())
    const fields = optimized.fields as Record<string, unknown>[]
    expect(fields[0]).not.toHaveProperty('correctAnswers')
  })

  it('drops a disabled quiz block', () => {
    const config = makeConfig({
      quiz: {
        enabled: false,
        questionCount: 0,
        shuffleQuestions: false,
        timeLimitSeconds: 0,
        sealedBlob: '',
      },
    })
    expect(optimizeConfig(config)).not.toHaveProperty('quiz')
  })

  it('keeps an enabled quiz block', () => {
    const config = makeConfig({
      quiz: {
        enabled: true,
        questionCount: 5,
        shuffleQuestions: true,
        timeLimitSeconds: 600,
        sealedBlob: 's1:abc',
      },
    })
    const optimized = optimizeConfig(config)
    expect(optimized.quiz).toEqual({
      enabled: true,
      questionCount: 5,
      shuffleQuestions: true,
      timeLimitSeconds: 600,
      sealedBlob: 's1:abc',
    })
  })
})

describe('encodeConfig', () => {
  it('does not leak the answer key into the encoded string', () => {
    const encoded = encodeConfig(makeConfig())
    const decoded = decodeConfig(encoded)
    expect(decoded?.fields[0]).not.toHaveProperty('correctAnswers')
  })
})

describe('decodeConfig', () => {
  it('yields a null quiz for configs encoded before quiz mode existed', () => {
    const legacy = makeConfig()
    const encoded = encodeConfig(legacy)
    const decoded = decodeConfig(encoded)
    expect(decoded?.quiz).toBeNull()
  })
})
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — TypeScript rejects `correctAnswers` and `quiz` as unknown properties, and `optimizeConfig` does not strip them.

- [ ] **Step 6: Add the types**

In `src/types/index.ts`, after the `CustomWebhookConfig` interface (line 34):

```ts
export type ResultVisibility = 'none' | 'score' | 'full'

export interface QuizConfig {
  enabled: boolean
  questionCount: number
  shuffleQuestions: boolean
  timeLimitSeconds: number
  sealedBlob: string
}

export interface SealedPayload {
  webhookUrl: string
  passingScore: number
  questionCount: number
  resultVisibility: ResultVisibility
  answers: Record<string, string[]>
}
```

In the same file add `correctAnswers: string[]` to `FormField` after `customWebhook`, and `quiz: QuizConfig | null` to `FormConfig` after `conditionalMessages`.

- [ ] **Step 7: Strip the answer key when encoding**

In `src/services/config.ts`, inside `optimizeConfig`, add after the `showAdvancedSettings` deletion:

```ts
  const quiz = optimized.quiz as QuizConfig | null | undefined
  if (!quiz || !quiz.enabled) delete optimized.quiz
```

Inside the `optimized.fields` mapper, before `return f`:

```ts
      delete f.correctAnswers
```

Extend the type import at the top of the file to `import type { FormConfig, FieldOption, QuizConfig } from '../types'`.

- [ ] **Step 8: Normalize decoded configs**

In `src/services/config.ts`, inside `migrateConfig`, before `return config`:

```ts
  if (config.quiz === undefined) config.quiz = null
  for (const field of config.fields ?? []) {
    if (!Array.isArray(field.correctAnswers)) field.correctAnswers = []
  }
```

- [ ] **Step 9: Add the defaults to the store factories**

In `src/stores/formConfig.ts`, add `correctAnswers: []` to the object returned by `createField` (before `...overrides`), and `quiz: null` to the object returned by `createEmptyConfig` (after `conditionalMessages: []`).

- [ ] **Step 10: Run the tests and the type check**

Run: `npm test && npx vue-tsc -b`
Expected: all tests PASS, no type errors.

- [ ] **Step 11: Commit**

```bash
git add package.json package-lock.json vite.config.ts src/types/index.ts src/services/config.ts src/services/config.test.ts src/stores/formConfig.ts
git commit -m "feat: add quiz config types and answer key stripping"
```

---

### Task 2: Grading logic

**Files:**
- Create: `src/services/grading.ts`
- Test: `src/services/grading.test.ts`

**Interfaces:**
- Consumes: `SealedPayload` from Task 1.
- Produces:
  - `parseAnswerValues(raw: string): string[]`
  - `isAnswerCorrect(given: string, expected: string[]): boolean`
  - `gradeSubmission(input: GradeInput): GradeOutcome`
  - `GradeInput = { answerKey: Record<string, string[]>, servedFieldIds: string[], answers: Record<string, string>, questionCount: number }`
  - `GradedQuestion = { fieldId: string, correct: boolean }`
  - `GradeResult = { score: number, total: number, graded: GradedQuestion[] }`
  - `GradeOutcome = { ok: true, result: GradeResult } | { ok: false, error: 'unknown-field' | 'count-mismatch' }`

- [ ] **Step 1: Write the failing test**

Create `src/services/grading.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { parseAnswerValues, isAnswerCorrect, gradeSubmission } from './grading'

describe('parseAnswerValues', () => {
  it('splits checkbox answers on newlines', () => {
    expect(parseAnswerValues('A\nB')).toEqual(['A', 'B'])
  })

  it('drops empty segments', () => {
    expect(parseAnswerValues('A\n\nB\n')).toEqual(['A', 'B'])
  })

  it('returns an empty array for an empty answer', () => {
    expect(parseAnswerValues('')).toEqual([])
  })
})

describe('isAnswerCorrect', () => {
  it('accepts a single exact match', () => {
    expect(isAnswerCorrect('A', ['A'])).toBe(true)
  })

  it('rejects a different value', () => {
    expect(isAnswerCorrect('B', ['A'])).toBe(false)
  })

  it('ignores the order of multiple selections', () => {
    expect(isAnswerCorrect('B\nA', ['A', 'B'])).toBe(true)
  })

  it('rejects an extra selection', () => {
    expect(isAnswerCorrect('A\nB\nC', ['A', 'B'])).toBe(false)
  })

  it('rejects a missing selection', () => {
    expect(isAnswerCorrect('A', ['A', 'B'])).toBe(false)
  })

  it('rejects an empty answer', () => {
    expect(isAnswerCorrect('', ['A'])).toBe(false)
  })

  it('rejects a duplicated selection padding the count', () => {
    expect(isAnswerCorrect('A\nA', ['A', 'B'])).toBe(false)
  })
})

describe('gradeSubmission', () => {
  const answerKey = { q1: ['A'], q2: ['B', 'C'], q3: ['D'] }

  it('scores every served question', () => {
    const outcome = gradeSubmission({
      answerKey,
      servedFieldIds: ['q1', 'q2', 'q3'],
      answers: { q1: 'A', q2: 'C\nB', q3: 'X' },
      questionCount: 0,
    })
    expect(outcome).toEqual({
      ok: true,
      result: {
        score: 2,
        total: 3,
        graded: [
          { fieldId: 'q1', correct: true },
          { fieldId: 'q2', correct: true },
          { fieldId: 'q3', correct: false },
        ],
      },
    })
  })

  it('grades a subset when questionCount matches the served count', () => {
    const outcome = gradeSubmission({
      answerKey,
      servedFieldIds: ['q1', 'q3'],
      answers: { q1: 'A', q3: 'D' },
      questionCount: 2,
    })
    expect(outcome).toEqual({
      ok: true,
      result: {
        score: 2,
        total: 2,
        graded: [
          { fieldId: 'q1', correct: true },
          { fieldId: 'q3', correct: true },
        ],
      },
    })
  })

  it('treats a missing answer as wrong', () => {
    const outcome = gradeSubmission({
      answerKey,
      servedFieldIds: ['q1'],
      answers: {},
      questionCount: 1,
    })
    expect(outcome).toEqual({
      ok: true,
      result: { score: 0, total: 1, graded: [{ fieldId: 'q1', correct: false }] },
    })
  })

  it('rejects a field id absent from the answer key', () => {
    const outcome = gradeSubmission({
      answerKey,
      servedFieldIds: ['q1', 'nope'],
      answers: { q1: 'A', nope: 'A' },
      questionCount: 2,
    })
    expect(outcome).toEqual({ ok: false, error: 'unknown-field' })
  })

  it('rejects fewer served questions than questionCount', () => {
    const outcome = gradeSubmission({
      answerKey,
      servedFieldIds: ['q1'],
      answers: { q1: 'A' },
      questionCount: 2,
    })
    expect(outcome).toEqual({ ok: false, error: 'count-mismatch' })
  })

  it('rejects a partial submission when questionCount is 0', () => {
    const outcome = gradeSubmission({
      answerKey,
      servedFieldIds: ['q1'],
      answers: { q1: 'A' },
      questionCount: 0,
    })
    expect(outcome).toEqual({ ok: false, error: 'count-mismatch' })
  })

  it('rejects duplicated served ids inflating the count', () => {
    const outcome = gradeSubmission({
      answerKey,
      servedFieldIds: ['q1', 'q1'],
      answers: { q1: 'A' },
      questionCount: 2,
    })
    expect(outcome).toEqual({ ok: false, error: 'count-mismatch' })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/services/grading.test.ts`
Expected: FAIL — `Failed to resolve import "./grading"`.

- [ ] **Step 3: Write the implementation**

Create `src/services/grading.ts`:

```ts
export interface GradedQuestion {
  fieldId: string
  correct: boolean
}

export interface GradeResult {
  score: number
  total: number
  graded: GradedQuestion[]
}

export type GradeError = 'unknown-field' | 'count-mismatch'

export type GradeOutcome =
  | { ok: true; result: GradeResult }
  | { ok: false; error: GradeError }

export interface GradeInput {
  answerKey: Record<string, string[]>
  servedFieldIds: string[]
  answers: Record<string, string>
  questionCount: number
}

export function parseAnswerValues(raw: string): string[] {
  return raw.split('\n').filter((value) => value !== '')
}

export function isAnswerCorrect(given: string, expected: string[]): boolean {
  const givenSet = new Set(parseAnswerValues(given))
  const expectedSet = new Set(expected)
  if (givenSet.size !== expectedSet.size) return false
  for (const value of expectedSet) {
    if (!givenSet.has(value)) return false
  }
  return true
}

export function gradeSubmission(input: GradeInput): GradeOutcome {
  const { answerKey, servedFieldIds, answers, questionCount } = input
  const keyIds = Object.keys(answerKey)
  const expectedCount = questionCount > 0 ? questionCount : keyIds.length

  const uniqueServed = new Set(servedFieldIds)
  if (uniqueServed.size !== servedFieldIds.length) {
    return { ok: false, error: 'count-mismatch' }
  }
  if (servedFieldIds.some((id) => answerKey[id] === undefined)) {
    return { ok: false, error: 'unknown-field' }
  }
  if (servedFieldIds.length !== expectedCount) {
    return { ok: false, error: 'count-mismatch' }
  }

  const graded = servedFieldIds.map((fieldId) => ({
    fieldId,
    correct: isAnswerCorrect(answers[fieldId] ?? '', answerKey[fieldId] ?? []),
  }))

  return {
    ok: true,
    result: {
      score: graded.filter((question) => question.correct).length,
      total: graded.length,
      graded,
    },
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/services/grading.test.ts`
Expected: PASS, 17 tests.

- [ ] **Step 5: Commit**

```bash
git add src/services/grading.ts src/services/grading.test.ts
git commit -m "feat: add exact-match quiz grading"
```

---

### Task 3: Sealing and unsealing the answer key

**Files:**
- Create: `worker/seal.ts`
- Create: `tsconfig.worker.json`
- Modify: `tsconfig.json`
- Test: `worker/seal.test.ts`

**Interfaces:**
- Consumes: `SealedPayload` from Task 1.
- Produces:
  - `SEAL_PREFIX = 's1:'`
  - `seal(payload: SealedPayload, keyBase64: string): Promise<string>`
  - `unseal(blob: string, keyBase64: string): Promise<SealedPayload | null>`
  - `generateKeyBase64(): Promise<string>`

`unseal` returns `null` for every failure — wrong key, tampered ciphertext, bad prefix, malformed base64 — so callers cannot distinguish failure modes.

- [ ] **Step 1: Write the failing test**

Create `worker/seal.test.ts`:

```ts
import { describe, it, expect, beforeAll } from 'vitest'
import { seal, unseal, generateKeyBase64, SEAL_PREFIX } from './seal'
import type { SealedPayload } from '../src/types'

const payload: SealedPayload = {
  webhookUrl: 'https://discord.com/api/webhooks/1/token',
  passingScore: 16,
  questionCount: 20,
  resultVisibility: 'score',
  answers: { q1: ['A'], q2: ['B', 'C'] },
}

let key = ''
let otherKey = ''

beforeAll(async () => {
  key = await generateKeyBase64()
  otherKey = await generateKeyBase64()
})

describe('seal', () => {
  it('produces a versioned blob', async () => {
    const blob = await seal(payload, key)
    expect(blob.startsWith(SEAL_PREFIX)).toBe(true)
  })

  it('does not expose the webhook in the blob', async () => {
    const blob = await seal(payload, key)
    expect(blob).not.toContain('discord.com')
    expect(blob).not.toContain('token')
  })

  it('produces a different blob each time for the same payload', async () => {
    const first = await seal(payload, key)
    const second = await seal(payload, key)
    expect(first).not.toBe(second)
  })
})

describe('unseal', () => {
  it('round-trips the payload', async () => {
    const blob = await seal(payload, key)
    expect(await unseal(blob, key)).toEqual(payload)
  })

  it('fails under a different key', async () => {
    const blob = await seal(payload, key)
    expect(await unseal(blob, otherKey)).toBeNull()
  })

  it('fails on a tampered ciphertext', async () => {
    const blob = await seal(payload, key)
    const body = blob.slice(SEAL_PREFIX.length)
    const flipped =
      body.slice(0, body.length - 2) + (body.endsWith('AA') ? 'BB' : 'AA')
    expect(await unseal(SEAL_PREFIX + flipped, key)).toBeNull()
  })

  it('fails on a missing prefix', async () => {
    const blob = await seal(payload, key)
    expect(await unseal(blob.slice(SEAL_PREFIX.length), key)).toBeNull()
  })

  it('fails on garbage input', async () => {
    expect(await unseal(SEAL_PREFIX + '!!!not-base64!!!', key)).toBeNull()
  })

  it('fails on a blob too short to hold an IV', async () => {
    expect(await unseal(SEAL_PREFIX + 'AAAA', key)).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run worker/seal.test.ts`
Expected: FAIL — `Failed to resolve import "./seal"`.

- [ ] **Step 3: Write the implementation**

Create `worker/seal.ts`:

```ts
import type { SealedPayload } from '../src/types'

export const SEAL_PREFIX = 's1:'

const IV_BYTES = 12

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(value: string): Uint8Array | null {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  try {
    const binary = atob(padded)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
  } catch {
    return null
  }
}

async function importKey(keyBase64: string): Promise<CryptoKey> {
  const raw = fromBase64Url(keyBase64.replace(/\+/g, '-').replace(/\//g, '_'))
  if (!raw) throw new Error('Invalid seal key')
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ])
}

export async function generateKeyBase64(): Promise<string> {
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ])
  const raw = await crypto.subtle.exportKey('raw', key)
  return toBase64Url(new Uint8Array(raw))
}

export async function seal(payload: SealedPayload, keyBase64: string): Promise<string> {
  const key = await importKey(keyBase64)
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const plaintext = new TextEncoder().encode(JSON.stringify(payload))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext)
  const combined = new Uint8Array(iv.length + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), iv.length)
  return SEAL_PREFIX + toBase64Url(combined)
}

export async function unseal(
  blob: string,
  keyBase64: string,
): Promise<SealedPayload | null> {
  if (!blob.startsWith(SEAL_PREFIX)) return null
  const combined = fromBase64Url(blob.slice(SEAL_PREFIX.length))
  if (!combined || combined.length <= IV_BYTES) return null
  try {
    const key = await importKey(keyBase64)
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: combined.slice(0, IV_BYTES) },
      key,
      combined.slice(IV_BYTES),
    )
    return JSON.parse(new TextDecoder().decode(plaintext)) as SealedPayload
  } catch {
    return null
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run worker/seal.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 5: Add a type config for the worker**

Create `tsconfig.worker.json`:

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.worker.tsbuildinfo",
    "target": "ES2023",
    "lib": ["ES2023", "WebWorker"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "types": ["@cloudflare/workers-types"],
    "skipLibCheck": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["worker/**/*.ts", "src/types/index.ts", "src/services/grading.ts", "src/services/quizMessage.ts", "src/services/discord.ts"]
}
```

Install the types and add the reference in `tsconfig.json`:

```bash
npm install -D @cloudflare/workers-types wrangler
```

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" },
    { "path": "./tsconfig.worker.json" }
  ]
}
```

- [ ] **Step 6: Verify the type check passes**

Run: `npx vue-tsc -b`
Expected: no errors. `worker/seal.test.ts` imports Vitest globals through the file's own imports, so no extra test types are needed.

- [ ] **Step 7: Commit**

```bash
git add worker/seal.ts worker/seal.test.ts tsconfig.json tsconfig.worker.json package.json package-lock.json
git commit -m "feat: add AES-GCM sealing for quiz answer keys"
```

---

### Task 4: Discord result formatting

**Files:**
- Create: `src/services/quizMessage.ts`
- Test: `src/services/quizMessage.test.ts`

**Interfaces:**
- Consumes: `GradeResult`, `GradedQuestion` from Task 2; `FormField`, `DiscordEmbedField` from Task 1.
- Produces:
  - `QUIZ_PASSED_COLOR = 0x10b981`, `QUIZ_FAILED_COLOR = 0xef4444`
  - `buildResultSummary(result: GradeResult, passingScore: number, passed: boolean): string`
  - `buildFailedQuestionsField(result: GradeResult, fieldsById: Record<string, FormField>): DiscordEmbedField | null`
  - `buildManualReviewNote(hasOpenQuestions: boolean): string`

- [ ] **Step 1: Write the failing test**

Create `src/services/quizMessage.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  buildResultSummary,
  buildFailedQuestionsField,
  buildManualReviewNote,
  QUIZ_PASSED_COLOR,
  QUIZ_FAILED_COLOR,
} from './quizMessage'
import type { FormField } from '../types'
import type { GradeResult } from './grading'

function makeField(id: string, label: string): FormField {
  return {
    id,
    type: 'radio',
    label,
    placeholder: '',
    required: true,
    icon: 'question',
    options: [],
    formula: '',
    showTextInResponse: true,
    defaultValue: '',
    maxFiles: 10,
    conditional: null,
    customWebhook: null,
    correctAnswers: [],
  }
}

const result: GradeResult = {
  score: 1,
  total: 2,
  graded: [
    { fieldId: 'q1', correct: true },
    { fieldId: 'q2', correct: false },
  ],
}

describe('buildResultSummary', () => {
  it('reports a passing verdict', () => {
    expect(buildResultSummary({ ...result, score: 2 }, 2, true)).toBe(
      '**Результат: 2/2** · порог 2 · ✅ прошёл',
    )
  })

  it('reports a failing verdict', () => {
    expect(buildResultSummary(result, 2, false)).toBe(
      '**Результат: 1/2** · порог 2 · ❌ не прошёл',
    )
  })
})

describe('buildFailedQuestionsField', () => {
  it('lists the failed question labels', () => {
    const field = buildFailedQuestionsField(result, {
      q1: makeField('q1', 'First'),
      q2: makeField('q2', 'Second'),
    })
    expect(field).toEqual({
      name: '❌ Неверные ответы',
      value: '• Second',
      inline: false,
    })
  })

  it('returns null when everything is correct', () => {
    const perfect: GradeResult = {
      score: 1,
      total: 1,
      graded: [{ fieldId: 'q1', correct: true }],
    }
    expect(buildFailedQuestionsField(perfect, { q1: makeField('q1', 'First') })).toBeNull()
  })

  it('falls back to the field id when the label is unknown', () => {
    const field = buildFailedQuestionsField(result, {})
    expect(field?.value).toBe('• q2')
  })
})

describe('buildManualReviewNote', () => {
  it('notes open questions when present', () => {
    expect(buildManualReviewNote(true)).toBe(
      '⚠️ Есть открытые вопросы — требуется ручная проверка.',
    )
  })

  it('returns an empty string when there are none', () => {
    expect(buildManualReviewNote(false)).toBe('')
  })
})

describe('verdict colours', () => {
  it('uses distinct colours', () => {
    expect(QUIZ_PASSED_COLOR).not.toBe(QUIZ_FAILED_COLOR)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/services/quizMessage.test.ts`
Expected: FAIL — `Failed to resolve import "./quizMessage"`.

- [ ] **Step 3: Write the implementation**

Create `src/services/quizMessage.ts`:

```ts
import type { DiscordEmbedField, FormField } from '../types'
import type { GradeResult } from './grading'

export const QUIZ_PASSED_COLOR = 0x10b981
export const QUIZ_FAILED_COLOR = 0xef4444

export function buildResultSummary(
  result: GradeResult,
  passingScore: number,
  passed: boolean,
): string {
  const verdict = passed ? '✅ прошёл' : '❌ не прошёл'
  return `**Результат: ${result.score}/${result.total}** · порог ${passingScore} · ${verdict}`
}

export function buildFailedQuestionsField(
  result: GradeResult,
  fieldsById: Record<string, FormField>,
): DiscordEmbedField | null {
  const failed = result.graded.filter((question) => !question.correct)
  if (failed.length === 0) return null
  return {
    name: '❌ Неверные ответы',
    value: failed
      .map((question) => `• ${fieldsById[question.fieldId]?.label ?? question.fieldId}`)
      .join('\n'),
    inline: false,
  }
}

export function buildManualReviewNote(hasOpenQuestions: boolean): string {
  return hasOpenQuestions
    ? '⚠️ Есть открытые вопросы — требуется ручная проверка.'
    : ''
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/services/quizMessage.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/services/quizMessage.ts src/services/quizMessage.test.ts
git commit -m "feat: add quiz result formatting for Discord"
```

---

### Task 5: Worker endpoints

**Files:**
- Create: `worker/index.ts`
- Create: `worker/wrangler.toml`
- Create: `worker/README.md`
- Modify: `package.json`
- Test: `worker/index.test.ts`

**Interfaces:**
- Consumes: `seal`/`unseal` (Task 3), `gradeSubmission` (Task 2), `buildResultSummary`/`buildFailedQuestionsField`/`buildManualReviewNote`/colours (Task 4), `createDiscordEmbeds` from `src/services/discord.ts`.
- Produces the HTTP contract the client depends on in Task 6:
  - `POST /seal` — `Authorization: Bearer <AUTHOR_TOKEN>`, body `SealedPayload`, response `{ blob: string }`; `401` without a valid token, `400` on a malformed payload.
  - `POST /submit` — body `SubmitRequest`, response `QuizSubmitResponse`; `410` when the blob will not unseal, `400` on a grading rejection, `502` when Discord rejects the message.
  - `SubmitRequest = { blob: string, servedFieldIds: string[], answers: Record<string, string>, config: FormConfig, meta: { elapsedSeconds: number, timedOut: boolean } }`
  - `QuizSubmitResponse = { ok: true } | { ok: true, score: number, total: number, passed: boolean } | { ok: true, score: number, total: number, passed: boolean, graded: GradedQuestion[] }`

The client sends the full public `FormConfig` so the worker can reuse `createDiscordEmbeds` for the answer dump. The worker ignores `config.webhookUrl` entirely and uses the sealed one.

- [ ] **Step 1: Write the failing test**

Create `worker/index.test.ts`:

```ts
import { describe, it, expect, beforeAll, vi, afterEach } from 'vitest'
import worker from './index'
import { seal, generateKeyBase64 } from './seal'
import type { FormConfig, FormField, SealedPayload } from '../src/types'

function makeField(id: string, label: string): FormField {
  return {
    id,
    type: 'radio',
    label,
    placeholder: '',
    required: true,
    icon: 'question',
    options: [
      { label: 'A', value: '' },
      { label: 'B', value: '' },
    ],
    formula: '',
    showTextInResponse: true,
    defaultValue: '',
    maxFiles: 10,
    conditional: null,
    customWebhook: null,
    correctAnswers: [],
  }
}

const config: FormConfig = {
  title: 'Exam',
  description: '',
  customMessage: '',
  webhookUrl: '',
  webhookUsername: 'Exam bot',
  webhookAvatarUrl: '',
  organization: 'LSPD',
  sendAsPlainText: false,
  displayUsername: true,
  showAdvancedSettings: false,
  sendQuestionNumbers: true,
  sendEmojis: false,
  sendColons: true,
  fields: [makeField('q1', 'First'), makeField('q2', 'Second')],
  conditionalMessages: [],
  quiz: {
    enabled: true,
    questionCount: 2,
    shuffleQuestions: false,
    timeLimitSeconds: 0,
    sealedBlob: '',
  },
}

const payload: SealedPayload = {
  webhookUrl: 'https://discord.com/api/webhooks/1/token',
  passingScore: 2,
  questionCount: 2,
  resultVisibility: 'score',
  answers: { q1: ['A'], q2: ['B'] },
}

let env: { SEAL_KEY: string; AUTHOR_TOKEN: string }

beforeAll(async () => {
  env = { SEAL_KEY: await generateKeyBase64(), AUTHOR_TOKEN: 'secret-token' }
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function stubDiscordOk(): { calls: string[] } {
  const calls: string[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      calls.push(url)
      return new Response('', { status: 204 })
    }),
  )
  return { calls }
}

function post(path: string, body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(`https://worker.test${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

async function submitBody(overrides: Record<string, unknown> = {}) {
  return {
    blob: await seal(payload, env.SEAL_KEY),
    servedFieldIds: ['q1', 'q2'],
    answers: { q1: 'A', q2: 'B' },
    config,
    meta: { elapsedSeconds: 42, timedOut: false },
    ...overrides,
  }
}

describe('POST /seal', () => {
  it('rejects a request without the author token', async () => {
    const response = await worker.fetch(post('/seal', payload), env)
    expect(response.status).toBe(401)
  })

  it('rejects a wrong author token', async () => {
    const response = await worker.fetch(
      post('/seal', payload, { Authorization: 'Bearer nope' }),
      env,
    )
    expect(response.status).toBe(401)
  })

  it('returns a blob for a valid request', async () => {
    const response = await worker.fetch(
      post('/seal', payload, { Authorization: `Bearer ${env.AUTHOR_TOKEN}` }),
      env,
    )
    expect(response.status).toBe(200)
    const body = (await response.json()) as { blob: string }
    expect(body.blob.startsWith('s1:')).toBe(true)
  })

  it('rejects a payload without a webhook url', async () => {
    const response = await worker.fetch(
      post('/seal', { ...payload, webhookUrl: '' }, {
        Authorization: `Bearer ${env.AUTHOR_TOKEN}`,
      }),
      env,
    )
    expect(response.status).toBe(400)
  })
})

describe('POST /submit', () => {
  it('grades and posts to the sealed webhook', async () => {
    const { calls } = stubDiscordOk()
    const response = await worker.fetch(post('/submit', await submitBody()), env)
    expect(response.status).toBe(200)
    expect(calls).toEqual([payload.webhookUrl])
  })

  it('returns score and verdict for score visibility', async () => {
    stubDiscordOk()
    const response = await worker.fetch(post('/submit', await submitBody()), env)
    expect(await response.json()).toEqual({ ok: true, score: 2, total: 2, passed: true })
  })

  it('hides everything for none visibility', async () => {
    stubDiscordOk()
    const blob = await seal({ ...payload, resultVisibility: 'none' }, env.SEAL_KEY)
    const response = await worker.fetch(post('/submit', await submitBody({ blob })), env)
    expect(await response.json()).toEqual({ ok: true })
  })

  it('returns the breakdown for full visibility', async () => {
    stubDiscordOk()
    const blob = await seal({ ...payload, resultVisibility: 'full' }, env.SEAL_KEY)
    const response = await worker.fetch(
      post('/submit', await submitBody({ blob, answers: { q1: 'A', q2: 'A' } })),
      env,
    )
    expect(await response.json()).toEqual({
      ok: true,
      score: 1,
      total: 2,
      passed: false,
      graded: [
        { fieldId: 'q1', correct: true },
        { fieldId: 'q2', correct: false },
      ],
    })
  })

  it('returns 410 for a blob sealed with another key', async () => {
    const { calls } = stubDiscordOk()
    const foreignKey = await generateKeyBase64()
    const blob = await seal(payload, foreignKey)
    const response = await worker.fetch(post('/submit', await submitBody({ blob })), env)
    expect(response.status).toBe(410)
    expect(calls).toEqual([])
  })

  it('returns 400 and posts nothing when the served count is short', async () => {
    const { calls } = stubDiscordOk()
    const response = await worker.fetch(
      post('/submit', await submitBody({ servedFieldIds: ['q1'], answers: { q1: 'A' } })),
      env,
    )
    expect(response.status).toBe(400)
    expect(calls).toEqual([])
  })

  it('returns 502 when Discord rejects the message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('bad webhook', { status: 404 })),
    )
    const response = await worker.fetch(post('/submit', await submitBody()), env)
    expect(response.status).toBe(502)
  })
})

describe('routing', () => {
  it('answers preflight requests', async () => {
    const response = await worker.fetch(
      new Request('https://worker.test/submit', { method: 'OPTIONS' }),
      env,
    )
    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })

  it('returns 404 for an unknown path', async () => {
    const response = await worker.fetch(post('/nope', {}), env)
    expect(response.status).toBe(404)
  })

  it('rejects GET on /submit', async () => {
    const response = await worker.fetch(
      new Request('https://worker.test/submit', { method: 'GET' }),
      env,
    )
    expect(response.status).toBe(405)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run worker/index.test.ts`
Expected: FAIL — `Failed to resolve import "./index"`.

- [ ] **Step 3: Write the implementation**

Create `worker/index.ts`:

```ts
import { unseal, seal } from './seal'
import { gradeSubmission } from '../src/services/grading'
import {
  buildResultSummary,
  buildFailedQuestionsField,
  buildManualReviewNote,
  QUIZ_PASSED_COLOR,
  QUIZ_FAILED_COLOR,
} from '../src/services/quizMessage'
import { createDiscordEmbeds } from '../src/services/discord'
import type { FormConfig, FormField, SealedPayload, ResultVisibility } from '../src/types'

export interface Env {
  SEAL_KEY: string
  AUTHOR_TOKEN: string
  SUBMIT_LIMITER?: { limit(options: { key: string }): Promise<{ success: boolean }> }
}

interface SubmitRequest {
  blob: string
  servedFieldIds: string[]
  answers: Record<string, string>
  config: FormConfig
  meta: { elapsedSeconds: number; timedOut: boolean }
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
}

const GRADABLE_TYPES = new Set(['radio', 'select', 'checkboxes'])
const VISIBILITY_VALUES = new Set<ResultVisibility>(['none', 'score', 'full'])

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

function isSealedPayload(value: unknown): value is SealedPayload {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  if (typeof candidate.webhookUrl !== 'string' || candidate.webhookUrl === '') return false
  if (typeof candidate.passingScore !== 'number') return false
  if (typeof candidate.questionCount !== 'number') return false
  if (!VISIBILITY_VALUES.has(candidate.resultVisibility as ResultVisibility)) return false
  if (typeof candidate.answers !== 'object' || candidate.answers === null) return false
  return Object.values(candidate.answers as Record<string, unknown>).every(
    (entry) => Array.isArray(entry) && entry.every((item) => typeof item === 'string'),
  )
}

function isSubmitRequest(value: unknown): value is SubmitRequest {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  if (typeof candidate.blob !== 'string') return false
  if (!Array.isArray(candidate.servedFieldIds)) return false
  if (!candidate.servedFieldIds.every((id) => typeof id === 'string')) return false
  if (typeof candidate.answers !== 'object' || candidate.answers === null) return false
  if (typeof candidate.config !== 'object' || candidate.config === null) return false
  return Array.isArray((candidate.config as FormConfig).fields)
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    return null
  }
}

async function handleSeal(request: Request, env: Env): Promise<Response> {
  if (request.headers.get('Authorization') !== `Bearer ${env.AUTHOR_TOKEN}`) {
    return json({ error: 'unauthorized' }, 401)
  }
  const body = await readJson(request)
  if (!isSealedPayload(body)) return json({ error: 'bad-payload' }, 400)
  return json({ blob: await seal(body, env.SEAL_KEY) })
}

function buildQuizConfig(config: FormConfig, servedFieldIds: string[]): FormConfig {
  const served = new Set(servedFieldIds)
  const gradableIds = new Set(
    config.fields.filter((field) => GRADABLE_TYPES.has(field.type)).map((field) => field.id),
  )
  return {
    ...config,
    fields: config.fields.filter(
      (field) => served.has(field.id) || !gradableIds.has(field.id),
    ),
  }
}

function hasOpenQuestions(fields: FormField[]): boolean {
  return fields.some((field) => field.type === 'textarea')
}

async function handleSubmit(request: Request, env: Env): Promise<Response> {
  const body = await readJson(request)
  if (!isSubmitRequest(body)) return json({ error: 'bad-request' }, 400)

  const payload = await unseal(body.blob, env.SEAL_KEY)
  if (!payload) return json({ error: 'expired-link' }, 410)

  const outcome = gradeSubmission({
    answerKey: payload.answers,
    servedFieldIds: body.servedFieldIds,
    answers: body.answers,
    questionCount: payload.questionCount,
  })
  if (!outcome.ok) return json({ error: outcome.error }, 400)

  const { result } = outcome
  const passed = result.score >= payload.passingScore
  const reportConfig = buildQuizConfig(body.config, body.servedFieldIds)
  const embeds = createDiscordEmbeds(reportConfig, body.answers, 0)
  const fieldsById = Object.fromEntries(
    reportConfig.fields.map((field) => [field.id, field]),
  )
  const failedField = buildFailedQuestionsField(result, fieldsById)

  const firstEmbed = embeds[0]
  const lastEmbed = embeds[embeds.length - 1]
  if (firstEmbed) firstEmbed.color = passed ? QUIZ_PASSED_COLOR : QUIZ_FAILED_COLOR
  if (lastEmbed && failedField) lastEmbed.fields.push(failedField)

  const summaryLines = [
    buildResultSummary(result, payload.passingScore, passed),
    body.meta.timedOut ? '⏱ Время вышло, отправлено автоматически.' : '',
    buildManualReviewNote(hasOpenQuestions(reportConfig.fields)),
  ].filter((line) => line !== '')

  const discordResponse = await fetch(payload.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: summaryLines.join('\n'),
      embeds,
      username: body.config.webhookUsername || body.config.title,
      avatar_url: body.config.webhookAvatarUrl,
    }),
  })
  if (!discordResponse.ok) return json({ error: 'discord-failed' }, 502)

  if (payload.resultVisibility === 'none') return json({ ok: true })
  if (payload.resultVisibility === 'score') {
    return json({ ok: true, score: result.score, total: result.total, passed })
  }
  return json({
    ok: true,
    score: result.score,
    total: result.total,
    passed,
    graded: result.graded,
  })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS })
    }

    const path = new URL(request.url).pathname
    if (path !== '/seal' && path !== '/submit') return json({ error: 'not-found' }, 404)
    if (request.method !== 'POST') return json({ error: 'method-not-allowed' }, 405)

    if (path === '/submit' && env.SUBMIT_LIMITER) {
      const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown'
      const { success } = await env.SUBMIT_LIMITER.limit({ key: ip })
      if (!success) return json({ error: 'rate-limited' }, 429)
    }

    return path === '/seal' ? handleSeal(request, env) : handleSubmit(request, env)
  },
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run worker/index.test.ts`
Expected: PASS, 14 tests.

- [ ] **Step 5: Add the worker config**

Create `worker/wrangler.toml`:

```toml
name = "discord-forms-quiz"
main = "index.ts"
compatibility_date = "2026-07-01"

[[unsafe.bindings]]
name = "SUBMIT_LIMITER"
type = "ratelimit"
namespace_id = "1001"
simple = { limit = 10, period = 60 }
```

- [ ] **Step 6: Add deploy scripts**

In `package.json`, inside `"scripts"`:

```json
    "worker:dev": "wrangler dev --config worker/wrangler.toml",
    "worker:deploy": "wrangler deploy --config worker/wrangler.toml"
```

- [ ] **Step 7: Document the setup**

Create `worker/README.md`:

```markdown
# Quiz worker

Stateless Cloudflare Worker that seals quiz answer keys and grades submissions.

## Secrets

Generate the AES-GCM key once:

```bash
node --input-type=module -e "const k=await crypto.subtle.generateKey({name:'AES-GCM',length:256},true,['encrypt','decrypt']);const r=await crypto.subtle.exportKey('raw',k);console.log(Buffer.from(r).toString('base64url'))"
```

Then set both secrets:

```bash
npx wrangler secret put SEAL_KEY --config worker/wrangler.toml
npx wrangler secret put AUTHOR_TOKEN --config worker/wrangler.toml
```

`AUTHOR_TOKEN` is any long random string; form authors paste it into the editor once.

Rotating `SEAL_KEY` invalidates every previously issued quiz link. The Discord webhook does not
need to be recreated.

## Deploy

```bash
npm run worker:deploy
```

Put the resulting worker URL into `VITE_WORKER_URL` before building the SPA.
```

- [ ] **Step 8: Run the full suite and type check**

Run: `npm test && npx vue-tsc -b`
Expected: all PASS, no type errors.

- [ ] **Step 9: Commit**

```bash
git add worker/index.ts worker/index.test.ts worker/wrangler.toml worker/README.md package.json
git commit -m "feat: add quiz worker seal and submit endpoints"
```

---

### Task 6: Client worker calls and pool selection

**Files:**
- Create: `src/services/quiz.ts`
- Create: `src/services/quizPool.ts`
- Create: `src/services/quizStorage.ts`
- Test: `src/services/quiz.test.ts`
- Test: `src/services/quizPool.test.ts`

**Interfaces:**
- Consumes: the HTTP contract from Task 5, `GradedQuestion` from Task 2.
- Produces:
  - `quiz.ts`: `QuizSubmitResponse`, `WorkerCredentials = { url: string, token: string }`, `sealQuiz(payload: SealedPayload, credentials: WorkerCredentials): Promise<string>`, `submitQuiz(request: SubmitRequest, workerUrl: string): Promise<QuizSubmitResponse>`, `SubmitRequest`
  - `quizPool.ts`: `selectQuizFields(fields: FormField[], quiz: QuizConfig, random?: () => number): FormField[]`, `isGradableType(type: FieldType): boolean`
  - `quizStorage.ts`: `loadWorkerCredentials(): WorkerCredentials`, `saveWorkerCredentials(credentials: WorkerCredentials): void`, `loadAnswerKeyDraft(): Record<string, string[]>`, `saveAnswerKeyDraft(draft: Record<string, string[]>): void`

Both service functions throw `Error` with a Russian, user-facing message. Callers surface it via toasts.

- [ ] **Step 1: Write the failing pool test**

Create `src/services/quizPool.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { selectQuizFields, isGradableType } from './quizPool'
import type { FormField, QuizConfig } from '../types'

function makeField(id: string, type: FormField['type'] = 'radio'): FormField {
  return {
    id,
    type,
    label: id,
    placeholder: '',
    required: true,
    icon: 'question',
    options: [],
    formula: '',
    showTextInResponse: true,
    defaultValue: '',
    maxFiles: 10,
    conditional: null,
    customWebhook: null,
    correctAnswers: [],
  }
}

function makeQuiz(overrides: Partial<QuizConfig> = {}): QuizConfig {
  return {
    enabled: true,
    questionCount: 0,
    shuffleQuestions: false,
    timeLimitSeconds: 0,
    sealedBlob: '',
    ...overrides,
  }
}

const pool = [
  makeField('q1'),
  makeField('q2'),
  makeField('q3'),
  makeField('open', 'textarea'),
]

describe('isGradableType', () => {
  it('accepts option-based types', () => {
    expect(isGradableType('radio')).toBe(true)
    expect(isGradableType('select')).toBe(true)
    expect(isGradableType('checkboxes')).toBe(true)
  })

  it('rejects everything else', () => {
    expect(isGradableType('textarea')).toBe(false)
    expect(isGradableType('text')).toBe(false)
    expect(isGradableType('image')).toBe(false)
  })
})

describe('selectQuizFields', () => {
  it('keeps every field when questionCount is 0', () => {
    const selected = selectQuizFields(pool, makeQuiz())
    expect(selected.map((f) => f.id)).toEqual(['q1', 'q2', 'q3', 'open'])
  })

  it('picks the requested number of gradable questions', () => {
    const selected = selectQuizFields(pool, makeQuiz({ questionCount: 2 }), () => 0)
    expect(selected.filter((f) => isGradableType(f.type))).toHaveLength(2)
  })

  it('always keeps non-gradable fields', () => {
    const selected = selectQuizFields(pool, makeQuiz({ questionCount: 1 }), () => 0)
    expect(selected.some((f) => f.id === 'open')).toBe(true)
  })

  it('does not exceed the pool size', () => {
    const selected = selectQuizFields(pool, makeQuiz({ questionCount: 99 }), () => 0)
    expect(selected.filter((f) => isGradableType(f.type))).toHaveLength(3)
  })

  it('preserves the original order without shuffle', () => {
    const selected = selectQuizFields(pool, makeQuiz({ questionCount: 3 }), () => 0)
    expect(selected.map((f) => f.id)).toEqual(['q1', 'q2', 'q3', 'open'])
  })

  it('reorders gradable questions when shuffle is on', () => {
    const selected = selectQuizFields(
      pool,
      makeQuiz({ shuffleQuestions: true }),
      () => 0.99,
    )
    expect(selected.map((f) => f.id)).not.toEqual(['q1', 'q2', 'q3', 'open'])
  })

  it('never moves non-gradable fields ahead of questions', () => {
    const selected = selectQuizFields(
      pool,
      makeQuiz({ shuffleQuestions: true }),
      () => 0.99,
    )
    expect(selected[selected.length - 1]?.id).toBe('open')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/services/quizPool.test.ts`
Expected: FAIL — `Failed to resolve import "./quizPool"`.

- [ ] **Step 3: Implement pool selection**

Create `src/services/quizPool.ts`:

```ts
import type { FieldType, FormField, QuizConfig } from '../types'

const GRADABLE_TYPES: FieldType[] = ['radio', 'select', 'checkboxes']

export function isGradableType(type: FieldType): boolean {
  return GRADABLE_TYPES.includes(type)
}

function shuffled(items: FormField[], random: () => number): FormField[] {
  const result = items.slice()
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const current = result[i]
    const swap = result[j]
    if (current && swap) {
      result[i] = swap
      result[j] = current
    }
  }
  return result
}

export function selectQuizFields(
  fields: FormField[],
  quiz: QuizConfig,
  random: () => number = Math.random,
): FormField[] {
  const questions = fields.filter((field) => isGradableType(field.type))
  const others = fields.filter((field) => !isGradableType(field.type))

  const ordered = quiz.shuffleQuestions ? shuffled(questions, random) : questions
  const limit = quiz.questionCount > 0 ? Math.min(quiz.questionCount, ordered.length) : ordered.length
  const picked = ordered.slice(0, limit)

  if (quiz.questionCount > 0 && !quiz.shuffleQuestions) {
    const pickedIds = new Set(picked.map((field) => field.id))
    return fields.filter((field) => pickedIds.has(field.id) || !isGradableType(field.type))
  }

  return [...picked, ...others]
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/services/quizPool.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Write the failing client-service test**

Create `src/services/quiz.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { sealQuiz, submitQuiz } from './quiz'
import type { FormConfig, SealedPayload } from '../types'

const payload: SealedPayload = {
  webhookUrl: 'https://discord.com/api/webhooks/1/token',
  passingScore: 2,
  questionCount: 2,
  resultVisibility: 'score',
  answers: { q1: ['A'] },
}

const config = { title: 'Exam', fields: [] } as unknown as FormConfig

const submitRequest = {
  blob: 's1:abc',
  servedFieldIds: ['q1'],
  answers: { q1: 'A' },
  config,
  meta: { elapsedSeconds: 5, timedOut: false },
}

function stubFetch(status: number, body: unknown): ReturnType<typeof vi.fn> {
  const mock = vi.fn(
    async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
  )
  vi.stubGlobal('fetch', mock)
  return mock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('sealQuiz', () => {
  it('posts the payload with the author token', async () => {
    const mock = stubFetch(200, { blob: 's1:sealed' })
    const blob = await sealQuiz(payload, { url: 'https://w.test', token: 'tok' })
    expect(blob).toBe('s1:sealed')
    const [url, init] = mock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://w.test/seal')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok')
  })

  it('strips a trailing slash from the worker url', async () => {
    const mock = stubFetch(200, { blob: 's1:sealed' })
    await sealQuiz(payload, { url: 'https://w.test/', token: 'tok' })
    expect((mock.mock.calls[0] as [string])[0]).toBe('https://w.test/seal')
  })

  it('throws a readable error on a bad token', async () => {
    stubFetch(401, { error: 'unauthorized' })
    await expect(sealQuiz(payload, { url: 'https://w.test', token: 'bad' })).rejects.toThrow(
      'Неверный токен автора',
    )
  })

  it('throws when the worker url is empty', async () => {
    await expect(sealQuiz(payload, { url: '', token: 'tok' })).rejects.toThrow(
      'Не указан адрес воркера',
    )
  })

  it('throws a readable error when the worker is unreachable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('network down')
      }),
    )
    await expect(sealQuiz(payload, { url: 'https://w.test', token: 'tok' })).rejects.toThrow(
      'Воркер недоступен',
    )
  })
})

describe('submitQuiz', () => {
  it('returns the worker response', async () => {
    stubFetch(200, { ok: true, score: 2, total: 2, passed: true })
    const result = await submitQuiz(submitRequest, 'https://w.test')
    expect(result).toEqual({ ok: true, score: 2, total: 2, passed: true })
  })

  it('maps 410 to an expired-link message', async () => {
    stubFetch(410, { error: 'expired-link' })
    await expect(submitQuiz(submitRequest, 'https://w.test')).rejects.toThrow(
      'Ссылка на тест недействительна',
    )
  })

  it('maps 429 to a rate-limit message', async () => {
    stubFetch(429, { error: 'rate-limited' })
    await expect(submitQuiz(submitRequest, 'https://w.test')).rejects.toThrow(
      'Слишком много попыток',
    )
  })

  it('maps 502 to a Discord failure message', async () => {
    stubFetch(502, { error: 'discord-failed' })
    await expect(submitQuiz(submitRequest, 'https://w.test')).rejects.toThrow(
      'Не удалось отправить результат в Discord',
    )
  })

  it('maps 400 to an invalid-submission message', async () => {
    stubFetch(400, { error: 'count-mismatch' })
    await expect(submitQuiz(submitRequest, 'https://w.test')).rejects.toThrow(
      'Отправка отклонена',
    )
  })
})
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npx vitest run src/services/quiz.test.ts`
Expected: FAIL — `Failed to resolve import "./quiz"`.

- [ ] **Step 7: Implement the client service**

Create `src/services/quiz.ts`:

```ts
import type { FormConfig, SealedPayload } from '../types'
import type { GradedQuestion } from './grading'

export interface WorkerCredentials {
  url: string
  token: string
}

export interface SubmitRequest {
  blob: string
  servedFieldIds: string[]
  answers: Record<string, string>
  config: FormConfig
  meta: { elapsedSeconds: number; timedOut: boolean }
}

export interface QuizSubmitResponse {
  ok: true
  score?: number
  total?: number
  passed?: boolean
  graded?: GradedQuestion[]
}

const SUBMIT_ERRORS: Record<number, string> = {
  400: 'Отправка отклонена: набор вопросов не совпадает с тестом',
  410: 'Ссылка на тест недействительна. Запросите новую',
  429: 'Слишком много попыток. Подождите минуту',
  502: 'Не удалось отправить результат в Discord',
}

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, '')
}

async function postJson(url: string, body: unknown, token?: string): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  try {
    return await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
  } catch {
    throw new Error('Воркер недоступен. Проверьте адрес и подключение')
  }
}

export async function sealQuiz(
  payload: SealedPayload,
  credentials: WorkerCredentials,
): Promise<string> {
  const base = normalizeUrl(credentials.url)
  if (!base) throw new Error('Не указан адрес воркера')

  const response = await postJson(`${base}/seal`, payload, credentials.token)
  if (response.status === 401) throw new Error('Неверный токен автора')
  if (!response.ok) throw new Error('Воркер отклонил настройки теста')

  const body = (await response.json()) as { blob?: string }
  if (!body.blob) throw new Error('Воркер вернул пустой ответ')
  return body.blob
}

export async function submitQuiz(
  request: SubmitRequest,
  workerUrl: string,
): Promise<QuizSubmitResponse> {
  const base = normalizeUrl(workerUrl)
  if (!base) throw new Error('Не указан адрес воркера')

  const response = await postJson(`${base}/submit`, request)
  if (!response.ok) {
    throw new Error(SUBMIT_ERRORS[response.status] ?? 'Не удалось отправить ответы')
  }
  return (await response.json()) as QuizSubmitResponse
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npx vitest run src/services/quiz.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 9: Implement local storage**

Create `src/services/quizStorage.ts`:

```ts
import type { WorkerCredentials } from './quiz'

const CREDENTIALS_KEY = 'discord-forms-worker'
const ANSWER_KEY_DRAFT = 'discord-forms-quiz-draft'

const EMPTY_CREDENTIALS: WorkerCredentials = {
  url: import.meta.env.VITE_WORKER_URL ?? '',
  token: '',
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function loadWorkerCredentials(): WorkerCredentials {
  const stored = readJson<Partial<WorkerCredentials>>(CREDENTIALS_KEY, {})
  return {
    url: stored.url || EMPTY_CREDENTIALS.url,
    token: stored.token || '',
  }
}

export function saveWorkerCredentials(credentials: WorkerCredentials): void {
  localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials))
}

export function loadAnswerKeyDraft(): Record<string, string[]> {
  return readJson<Record<string, string[]>>(ANSWER_KEY_DRAFT, {})
}

export function saveAnswerKeyDraft(draft: Record<string, string[]>): void {
  localStorage.setItem(ANSWER_KEY_DRAFT, JSON.stringify(draft))
}
```

Add the env type to `src/vite-env.d.ts`:

```ts
interface ImportMetaEnv {
  readonly VITE_WORKER_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

- [ ] **Step 10: Run the full suite and type check**

Run: `npm test && npx vue-tsc -b`
Expected: all PASS, no type errors.

- [ ] **Step 11: Commit**

```bash
git add src/services/quiz.ts src/services/quiz.test.ts src/services/quizPool.ts src/services/quizPool.test.ts src/services/quizStorage.ts src/vite-env.d.ts
git commit -m "feat: add quiz worker client, pool selection and local storage"
```

---

### Task 7: Store wiring and share-link sealing

**Files:**
- Modify: `src/stores/formConfig.ts`
- Modify: `src/components/editor/EditorSidebar.vue:295-308`
- Modify: `src/components/common/CommandPalette.vue:157-168`
- Test: `src/stores/formConfig.test.ts`

**Interfaces:**
- Consumes: `sealQuiz`, `WorkerCredentials` (Task 6), `loadAnswerKeyDraft`/`saveAnswerKeyDraft`/`loadWorkerCredentials`/`saveWorkerCredentials` (Task 6), `isGradableType` (Task 6).
- Produces on the store:
  - `answerKey: Ref<Record<string, string[]>>`
  - `workerCredentials: Ref<WorkerCredentials>`
  - `setCorrectAnswers(fieldId: string, values: string[]): void`
  - `getAnswerKeyForSharing(): Record<string, string[]>`
  - `getShareUrl(): Promise<string>` — now async; seals first when `quiz.enabled`
  - `ensureQuiz(): QuizConfig`
  - `passingScore: Ref<number>`, `resultVisibility: Ref<ResultVisibility>` — author-only, persisted with the draft, never in `FormConfig`

`passingScore` and `resultVisibility` live on the store rather than in `FormConfig` because they must never be encoded into the URL.

- [ ] **Step 1: Write the failing test**

Create `src/stores/formConfig.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useFormConfigStore } from './formConfig'

vi.mock('../services/quiz', () => ({
  sealQuiz: vi.fn(async () => 's1:sealed-blob'),
}))

const storage = new Map<string, string>()

beforeEach(() => {
  storage.clear()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
  })
  vi.stubGlobal('location', new URL('https://forms.test/DiscordForms/'))
  setActivePinia(createPinia())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('answer key', () => {
  it('stores correct answers per field', () => {
    const store = useFormConfigStore()
    const fieldId = store.config.fields[0]?.id ?? ''
    store.setCorrectAnswers(fieldId, ['A'])
    expect(store.answerKey[fieldId]).toEqual(['A'])
  })

  it('persists the answer key to localStorage', () => {
    const store = useFormConfigStore()
    const fieldId = store.config.fields[0]?.id ?? ''
    store.setCorrectAnswers(fieldId, ['A'])
    expect(storage.get('discord-forms-quiz-draft')).toContain('"A"')
  })

  it('excludes answers for removed fields when sharing', () => {
    const store = useFormConfigStore()
    store.setCorrectAnswers('ghost', ['A'])
    expect(store.getAnswerKeyForSharing()).toEqual({})
  })

  it('excludes answers for non-gradable fields when sharing', () => {
    const store = useFormConfigStore()
    const textField = store.config.fields.find((f) => f.type === 'text')
    store.setCorrectAnswers(textField?.id ?? '', ['A'])
    expect(store.getAnswerKeyForSharing()).toEqual({})
  })
})

describe('getShareUrl', () => {
  it('returns a plain link when the quiz is off', async () => {
    const store = useFormConfigStore()
    const url = await store.getShareUrl()
    expect(url).toContain('#config=')
    expect(url).not.toContain('sealed-blob')
  })

  it('seals the answer key before building a quiz link', async () => {
    const store = useFormConfigStore()
    const quiz = store.ensureQuiz()
    quiz.enabled = true
    store.config.fields = [
      {
        ...(store.config.fields[0] as never),
        id: 'q1',
        type: 'radio',
        label: 'Question',
        options: [{ label: 'A', value: '' }],
      },
    ]
    store.setCorrectAnswers('q1', ['A'])
    store.config.webhookUrl = 'https://discord.com/api/webhooks/1/token'

    const url = await store.getShareUrl()
    expect(store.config.quiz?.sealedBlob).toBe('s1:sealed-blob')
    expect(url).not.toContain('discord.com')
  })

  it('refuses to build a quiz link with no marked answers', async () => {
    const store = useFormConfigStore()
    const quiz = store.ensureQuiz()
    quiz.enabled = true
    store.config.webhookUrl = 'https://discord.com/api/webhooks/1/token'
    await expect(store.getShareUrl()).rejects.toThrow('Не отмечен ни один правильный ответ')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/stores/formConfig.test.ts`
Expected: FAIL — `setCorrectAnswers is not a function`.

- [ ] **Step 3: Add the quiz state to the store**

In `src/stores/formConfig.ts`, extend the imports:

```ts
import type { FormConfig, FormField, FieldOption, FieldType, QuizConfig, ResultVisibility } from '../types'
import { sealQuiz } from '../services/quiz'
import type { WorkerCredentials } from '../services/quiz'
import {
  loadAnswerKeyDraft,
  saveAnswerKeyDraft,
  loadWorkerCredentials,
  saveWorkerCredentials,
} from '../services/quizStorage'
import { isGradableType } from '../services/quizPool'
```

Inside the store setup, after `const saveStatus = ref<SaveStatus>('idle')`:

```ts
  const answerKey = ref<Record<string, string[]>>(loadAnswerKeyDraft())
  const workerCredentials = ref<WorkerCredentials>(loadWorkerCredentials())
  const passingScore = ref(0)
  const resultVisibility = ref<ResultVisibility>('score')

  function setCorrectAnswers(fieldId: string, values: string[]): void {
    if (values.length === 0) {
      delete answerKey.value[fieldId]
    } else {
      answerKey.value[fieldId] = values
    }
    saveAnswerKeyDraft(answerKey.value)
  }

  function setWorkerCredentials(credentials: WorkerCredentials): void {
    workerCredentials.value = credentials
    saveWorkerCredentials(credentials)
  }

  function ensureQuiz(): QuizConfig {
    if (!config.value.quiz) {
      config.value.quiz = {
        enabled: false,
        questionCount: 0,
        shuffleQuestions: false,
        timeLimitSeconds: 0,
        sealedBlob: '',
      }
    }
    return config.value.quiz
  }

  function getAnswerKeyForSharing(): Record<string, string[]> {
    const gradableIds = new Set(
      config.value.fields.filter((f) => isGradableType(f.type)).map((f) => f.id),
    )
    return Object.fromEntries(
      Object.entries(answerKey.value).filter(([fieldId]) => gradableIds.has(fieldId)),
    )
  }
```

- [ ] **Step 4: Make share-link generation seal first**

Replace `getShareUrl` in `src/stores/formConfig.ts`:

```ts
  async function getShareUrl(): Promise<string> {
    const quiz = config.value.quiz
    if (!quiz || !quiz.enabled) {
      return generateShareUrl(config.value)
    }

    const answers = getAnswerKeyForSharing()
    if (Object.keys(answers).length === 0) {
      throw new Error('Не отмечен ни один правильный ответ')
    }

    quiz.sealedBlob = await sealQuiz(
      {
        webhookUrl: config.value.webhookUrl,
        passingScore: passingScore.value,
        questionCount: quiz.questionCount,
        resultVisibility: resultVisibility.value,
        answers,
      },
      workerCredentials.value,
    )

    const shared: FormConfig = { ...config.value, webhookUrl: '' }
    return generateShareUrl(shared)
  }
```

Export the new members from the store's return object: `answerKey`, `workerCredentials`, `passingScore`, `resultVisibility`, `setCorrectAnswers`, `setWorkerCredentials`, `ensureQuiz`, `getAnswerKeyForSharing`.

- [ ] **Step 5: Include the answer key in export and import**

In `exportConfig`, replace the stringified payload:

```ts
    const json = JSON.stringify(
      { config: stripped, answerKey: answerKey.value, passingScore: passingScore.value, resultVisibility: resultVisibility.value },
      null,
      2,
    )
```

In `importConfig`, after parsing, handle both shapes:

```ts
          const parsed = JSON.parse(reader.result as string) as
            | FormConfig
            | {
                config: FormConfig
                answerKey?: Record<string, string[]>
                passingScore?: number
                resultVisibility?: ResultVisibility
              }
          const isWrapped = 'config' in parsed
          const imported = (isWrapped ? parsed.config : parsed) as FormConfig
          if (isWrapped) {
            answerKey.value = parsed.answerKey ?? {}
            passingScore.value = parsed.passingScore ?? 0
            resultVisibility.value = parsed.resultVisibility ?? 'score'
            saveAnswerKeyDraft(answerKey.value)
          }
```

Keep the rest of `importConfig` operating on `imported`.

- [ ] **Step 6: Update the two share-link call sites**

In `src/components/editor/EditorSidebar.vue`, inside `onCopyLink`, replace the URL line and wrap the body:

```ts
  try {
    const url = await store.getShareUrl()
    const ok = await copyToClipboard(url)
    if (ok) {
      showCopied()
      toastSuccess('Ссылка скопирована')
      saveToHistory(config, url)
    }
  } catch (error) {
    toastError('Не удалось создать ссылку', error instanceof Error ? error.message : '')
  }
```

In `src/components/common/CommandPalette.vue`, inside the copy-link action:

```ts
      try {
        const ok = await copyToClipboard(await store.getShareUrl())
        if (ok) {
          toast.success('Ссылка скопирована')
        } else {
          toast.error('Не удалось скопировать ссылку')
        }
      } catch (error) {
        toast.error('Не удалось создать ссылку', error instanceof Error ? error.message : '')
      }
```

- [ ] **Step 7: Run the tests and type check**

Run: `npm test && npx vue-tsc -b`
Expected: all PASS, no type errors. If Pinia is missing from the test environment, the store test already installs it via `setActivePinia`.

- [ ] **Step 8: Commit**

```bash
git add src/stores/formConfig.ts src/stores/formConfig.test.ts src/components/editor/EditorSidebar.vue src/components/common/CommandPalette.vue
git commit -m "feat: seal quiz answer key when generating a share link"
```

---

### Task 8: Editor UI

**Files:**
- Create: `src/components/editor/QuizAnswersEditor.vue`
- Create: `src/components/editor/QuizSettings.vue`
- Create: `src/components/editor/WorkerSettings.vue`
- Modify: `src/components/editor/FieldEditor.vue:160-175`
- Modify: `src/components/editor/EditorSidebar.vue`

**Interfaces:**
- Consumes: store members from Task 7, `isGradableType` from Task 6.
- Produces: `QuizAnswersEditor` with prop `field: FormField`; `QuizSettings` and `WorkerSettings` take no props and read the store directly.

This task is UI-only and has no unit tests — it is verified by the manual checklist in its final step.

- [ ] **Step 1: Build the correct-answer picker**

Create `src/components/editor/QuizAnswersEditor.vue`:

```vue
<template>
  <div class="setting-group" v-if="store.config.quiz?.enabled">
    <label>Правильный ответ</label>
    <p class="quiz-hint" v-if="field.options.length === 0">
      Сначала добавьте варианты ответа.
    </p>
    <label
      v-for="option in field.options"
      :key="option.label"
      class="checkbox-setting"
    >
      <input
        :type="isMultiple ? 'checkbox' : 'radio'"
        :name="`correct-${field.id}`"
        :checked="selected.includes(effectiveValue(option))"
        @change="onToggle(effectiveValue(option), ($event.target as HTMLInputElement).checked)"
      />
      <span>{{ option.label }}</span>
    </label>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useFormConfigStore } from '../../stores/formConfig'
import type { FieldOption, FormField } from '../../types'

const props = defineProps<{ field: FormField }>()

const store = useFormConfigStore()

const isMultiple = computed(() => props.field.type === 'checkboxes')
const selected = computed(() => store.answerKey[props.field.id] ?? [])

function effectiveValue(option: FieldOption): string {
  return option.value || option.label
}

function onToggle(value: string, checked: boolean): void {
  if (!isMultiple.value) {
    store.setCorrectAnswers(props.field.id, checked ? [value] : [])
    return
  }
  const next = selected.value.filter((item) => item !== value)
  if (checked) next.push(value)
  store.setCorrectAnswers(props.field.id, next)
}
</script>
```

- [ ] **Step 2: Mount the picker in the field editor**

In `src/components/editor/FieldEditor.vue`, import the component and render it directly after the existing options block (the block guarded by the `hasOptions` computed at line 167):

```vue
    <QuizAnswersEditor v-if="hasOptions" :field="field" />
```

```ts
import QuizAnswersEditor from './QuizAnswersEditor.vue'
```

- [ ] **Step 3: Build the quiz settings section**

Create `src/components/editor/QuizSettings.vue`:

```vue
<template>
  <div class="editor-section">
    <h3>Тест</h3>
    <div class="setting-group">
      <label class="checkbox-setting">
        <input type="checkbox" v-model="quiz.enabled" @change="store.updateConfig()" />
        <span>Режим теста с проверкой ответов</span>
      </label>
    </div>
    <template v-if="quiz.enabled">
      <p class="quiz-warning">
        Правильные ответы хранятся только в этом браузере. Экспортируйте форму в JSON —
        иначе после очистки данных браузера эталон будет потерян.
      </p>
      <div class="setting-group">
        <label>Порог прохождения (баллов)</label>
        <input
          type="number"
          min="0"
          :value="store.passingScore"
          @input="store.passingScore = Number(($event.target as HTMLInputElement).value)"
        />
      </div>
      <div class="setting-group">
        <label>Вопросов из пула (0 — все)</label>
        <input
          type="number"
          min="0"
          v-model.number="quiz.questionCount"
          @input="store.updateConfig()"
        />
      </div>
      <div class="setting-group">
        <label class="checkbox-setting">
          <input
            type="checkbox"
            v-model="quiz.shuffleQuestions"
            @change="store.updateConfig()"
          />
          <span>Перемешивать вопросы</span>
        </label>
      </div>
      <div class="setting-group">
        <label>Ограничение времени (секунд, 0 — без лимита)</label>
        <input
          type="number"
          min="0"
          v-model.number="quiz.timeLimitSeconds"
          @input="store.updateConfig()"
        />
      </div>
      <div class="setting-group">
        <label>Что видит кандидат</label>
        <select :value="store.resultVisibility" @change="onVisibilityChange">
          <option value="none">Ничего</option>
          <option value="score">Балл и вердикт</option>
          <option value="full">Полный разбор</option>
        </select>
        <p class="quiz-warning" v-if="store.resultVisibility === 'full'">
          Полный разбор отдаёт кандидату правильные ответы. Одно прохождение — и ответы
          известны всем.
        </p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useFormConfigStore } from '../../stores/formConfig'
import type { ResultVisibility } from '../../types'

const store = useFormConfigStore()
const quiz = computed(() => store.ensureQuiz())

function onVisibilityChange(event: Event): void {
  store.resultVisibility = (event.target as HTMLSelectElement).value as ResultVisibility
}
</script>
```

- [ ] **Step 4: Build the worker settings panel**

Create `src/components/editor/WorkerSettings.vue`:

```vue
<template>
  <div class="editor-section" v-if="store.config.quiz?.enabled">
    <h3>Воркер проверки</h3>
    <div class="setting-group">
      <label>URL воркера</label>
      <input
        type="url"
        :value="store.workerCredentials.url"
        placeholder="https://discord-forms-quiz.workers.dev"
        @input="onChange('url', $event)"
      />
    </div>
    <div class="setting-group">
      <label>Токен автора</label>
      <input
        type="password"
        :value="store.workerCredentials.token"
        placeholder="AUTHOR_TOKEN"
        @input="onChange('token', $event)"
      />
    </div>
    <p class="quiz-hint">
      Токен хранится только в этом браузере и не попадает в ссылку.
    </p>
  </div>
</template>

<script setup lang="ts">
import { useFormConfigStore } from '../../stores/formConfig'

const store = useFormConfigStore()

function onChange(key: 'url' | 'token', event: Event): void {
  const value = (event.target as HTMLInputElement).value
  store.setWorkerCredentials({ ...store.workerCredentials, [key]: value })
}
</script>
```

- [ ] **Step 5: Mount both sections in the sidebar**

In `src/components/editor/EditorSidebar.vue`, import `QuizSettings` and `WorkerSettings` and render them after the existing `FormSettings` block in the same tab.

- [ ] **Step 6: Verify manually**

Run: `npm run dev`

Check, in order:
1. Quiz section is collapsed/disabled by default; existing forms are untouched.
2. Enabling the quiz reveals the answer picker on `radio`, `select` and `checkboxes` fields only.
3. `radio`/`select` allow exactly one correct answer; `checkboxes` allows several.
4. Selecting `full` visibility shows the red warning.
5. Reloading the page keeps the marked answers (they come from `localStorage`).
6. The address bar never contains a marked answer value — search the URL for it.

- [ ] **Step 7: Run the type check**

Run: `npx vue-tsc -b && npm test`
Expected: no type errors, all tests PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/editor/QuizAnswersEditor.vue src/components/editor/QuizSettings.vue src/components/editor/WorkerSettings.vue src/components/editor/FieldEditor.vue src/components/editor/EditorSidebar.vue
git commit -m "feat: add quiz editor UI"
```

---

### Task 9: Taking the quiz

**Files:**
- Create: `src/composables/useQuizAttempt.ts`
- Create: `src/components/form/QuizTimer.vue`
- Create: `src/components/form/QuizResult.vue`
- Modify: `src/components/form/FormView.vue:22-35,142-183`
- Test: `src/composables/useQuizAttempt.test.ts`

**Interfaces:**
- Consumes: `selectQuizFields` (Task 6), `submitQuiz`/`QuizSubmitResponse` (Task 6).
- Produces: `useQuizAttempt(config: Ref<FormConfig>, onTimeout: () => void)` returning `{ servedFields: ComputedRef<FormField[]>, remainingSeconds: Ref<number>, elapsedSeconds: Ref<number>, timedOut: Ref<boolean>, stop: () => void }`.

- [ ] **Step 1: Write the failing test**

Create `src/composables/useQuizAttempt.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { useQuizAttempt } from './useQuizAttempt'
import type { FormConfig, FormField } from '../types'

function makeField(id: string, type: FormField['type'] = 'radio'): FormField {
  return {
    id,
    type,
    label: id,
    placeholder: '',
    required: true,
    icon: 'question',
    options: [],
    formula: '',
    showTextInResponse: true,
    defaultValue: '',
    maxFiles: 10,
    conditional: null,
    customWebhook: null,
    correctAnswers: [],
  }
}

function makeConfig(timeLimitSeconds: number, questionCount = 0): FormConfig {
  return {
    title: 'Exam',
    description: '',
    customMessage: '',
    webhookUrl: '',
    webhookUsername: '',
    webhookAvatarUrl: '',
    organization: 'LSPD',
    sendAsPlainText: false,
    displayUsername: true,
    showAdvancedSettings: false,
    sendQuestionNumbers: true,
    sendEmojis: false,
    sendColons: true,
    fields: [makeField('q1'), makeField('q2'), makeField('open', 'textarea')],
    conditionalMessages: [],
    quiz: {
      enabled: true,
      questionCount,
      shuffleQuestions: false,
      timeLimitSeconds,
      sealedBlob: 's1:blob',
    },
  }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useQuizAttempt', () => {
  it('serves the whole pool when questionCount is 0', () => {
    const { servedFields } = useQuizAttempt(ref(makeConfig(0)), () => {})
    expect(servedFields.value.map((f) => f.id)).toEqual(['q1', 'q2', 'open'])
  })

  it('limits questions to questionCount and keeps open questions', () => {
    const { servedFields } = useQuizAttempt(ref(makeConfig(0, 1)), () => {})
    const ids = servedFields.value.map((f) => f.id)
    expect(ids).toHaveLength(2)
    expect(ids).toContain('open')
  })

  it('keeps the served set stable across reads', () => {
    const { servedFields } = useQuizAttempt(ref(makeConfig(0, 1)), () => {})
    expect(servedFields.value.map((f) => f.id)).toEqual(servedFields.value.map((f) => f.id))
  })

  it('counts down the time limit', () => {
    const { remainingSeconds } = useQuizAttempt(ref(makeConfig(10)), () => {})
    vi.advanceTimersByTime(3000)
    expect(remainingSeconds.value).toBe(7)
  })

  it('tracks elapsed seconds', () => {
    const { elapsedSeconds } = useQuizAttempt(ref(makeConfig(10)), () => {})
    vi.advanceTimersByTime(4000)
    expect(elapsedSeconds.value).toBe(4)
  })

  it('fires the timeout callback once at zero', () => {
    const onTimeout = vi.fn()
    const { timedOut } = useQuizAttempt(ref(makeConfig(2)), onTimeout)
    vi.advanceTimersByTime(5000)
    expect(onTimeout).toHaveBeenCalledTimes(1)
    expect(timedOut.value).toBe(true)
  })

  it('does not start a timer when there is no limit', () => {
    const onTimeout = vi.fn()
    const { remainingSeconds } = useQuizAttempt(ref(makeConfig(0)), onTimeout)
    vi.advanceTimersByTime(10000)
    expect(onTimeout).not.toHaveBeenCalled()
    expect(remainingSeconds.value).toBe(0)
  })

  it('stops the timer on demand', () => {
    const onTimeout = vi.fn()
    const { stop } = useQuizAttempt(ref(makeConfig(3)), onTimeout)
    stop()
    vi.advanceTimersByTime(10000)
    expect(onTimeout).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/composables/useQuizAttempt.test.ts`
Expected: FAIL — `Failed to resolve import "./useQuizAttempt"`.

- [ ] **Step 3: Implement the composable**

Create `src/composables/useQuizAttempt.ts`:

```ts
import { ref, computed, shallowRef, onUnmounted } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import { selectQuizFields } from '../services/quizPool'
import type { FormConfig, FormField } from '../types'

export interface QuizAttempt {
  servedFields: ComputedRef<FormField[]>
  remainingSeconds: Ref<number>
  elapsedSeconds: Ref<number>
  timedOut: Ref<boolean>
  stop: () => void
}

export function useQuizAttempt(
  config: Ref<FormConfig>,
  onTimeout: () => void,
): QuizAttempt {
  const quiz = config.value.quiz
  const served = shallowRef<FormField[]>(
    quiz ? selectQuizFields(config.value.fields, quiz) : config.value.fields,
  )

  const timeLimit = quiz?.timeLimitSeconds ?? 0
  const remainingSeconds = ref(timeLimit)
  const elapsedSeconds = ref(0)
  const timedOut = ref(false)

  let interval: ReturnType<typeof setInterval> | null = null

  function stop(): void {
    if (interval !== null) {
      clearInterval(interval)
      interval = null
    }
  }

  if (timeLimit > 0) {
    interval = setInterval(() => {
      elapsedSeconds.value += 1
      remainingSeconds.value = Math.max(0, timeLimit - elapsedSeconds.value)
      if (remainingSeconds.value === 0) {
        stop()
        timedOut.value = true
        onTimeout()
      }
    }, 1000)
  }

  onUnmounted(stop)

  return {
    servedFields: computed(() => served.value),
    remainingSeconds,
    elapsedSeconds,
    timedOut,
    stop,
  }
}
```

`onUnmounted` outside a component instance logs a Vue warning in tests but does not throw; the tests call `stop()` explicitly where cleanup matters.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/composables/useQuizAttempt.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Build the timer display**

Create `src/components/form/QuizTimer.vue`:

```vue
<template>
  <div class="quiz-timer" :class="{ 'quiz-timer--urgent': seconds <= 60 }">
    <i class="fas fa-clock"></i>
    <span>{{ formatted }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ seconds: number }>()

const formatted = computed(() => {
  const minutes = Math.floor(props.seconds / 60)
  const rest = props.seconds % 60
  return `${minutes}:${String(rest).padStart(2, '0')}`
})
</script>
```

- [ ] **Step 6: Build the result screen**

Create `src/components/form/QuizResult.vue`:

```vue
<template>
  <div class="quiz-result" :class="verdictClass">
    <h2 v-if="result.score === undefined">Ответы отправлены</h2>
    <h2 v-else>{{ result.score }} / {{ result.total }}</h2>
    <p v-if="result.passed === true">✅ Тест сдан</p>
    <p v-else-if="result.passed === false">❌ Тест не сдан</p>
    <p v-else>Результат будет объявлен модератором.</p>
    <ul v-if="result.graded" class="quiz-breakdown">
      <li v-for="question in result.graded" :key="question.fieldId">
        {{ question.correct ? '✅' : '❌' }} {{ labelFor(question.fieldId) }}
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FormField } from '../../types'
import type { QuizSubmitResponse } from '../../services/quiz'

const props = defineProps<{
  result: QuizSubmitResponse
  fields: FormField[]
}>()

const verdictClass = computed(() => {
  if (props.result.passed === true) return 'quiz-result--passed'
  if (props.result.passed === false) return 'quiz-result--failed'
  return ''
})

function labelFor(fieldId: string): string {
  return props.fields.find((field) => field.id === fieldId)?.label ?? fieldId
}
</script>
```

- [ ] **Step 7: Wire the quiz path into the form**

In `src/components/form/FormView.vue`:

Add the imports:

```ts
import { useQuizAttempt } from '../../composables/useQuizAttempt'
import { submitQuiz } from '../../services/quiz'
import { loadWorkerCredentials } from '../../services/quizStorage'
import QuizTimer from './QuizTimer.vue'
import QuizResult from './QuizResult.vue'
import type { QuizSubmitResponse } from '../../services/quiz'
```

Add the state, after `const responseVisible = ref(false)`:

```ts
const isQuiz = computed(() => config.value.quiz?.enabled === true)
const quizResult = ref<QuizSubmitResponse | null>(null)
const attempt = useQuizAttempt(config, () => {
  void onSubmit()
})
const visibleFields = computed(() =>
  isQuiz.value ? attempt.servedFields.value : config.value.fields,
)
```

Replace the field loop's source in the template with `visibleFields`, and add the timer plus the result screen:

```vue
  <QuizTimer
    v-if="isQuiz && (config.quiz?.timeLimitSeconds ?? 0) > 0 && !quizResult"
    :seconds="attempt.remainingSeconds.value"
  />
  <QuizResult v-if="quizResult" :result="quizResult" :fields="visibleFields" />
  <form v-else class="contact-form" @submit.prevent="onSubmit">
    <FormField
      v-for="field in visibleFields"
      ...
```

In `onSubmit`, branch before the existing `sendToDiscord` call. Validation is skipped when the timer expired, because a partial submission must still go through:

```ts
  const valid = attempt.timedOut.value ? true : validateAll()
  if (!valid) {
    const errorCount = Object.keys(errors.value).length
    toast.error('Заполните форму корректно', `Найдено ${errorCount} ошибок`)
    return
  }
```

and replace the send block with:

```ts
  isLoading.value = true
  try {
    if (isQuiz.value) {
      attempt.stop()
      const credentials = loadWorkerCredentials()
      quizResult.value = await submitQuiz(
        {
          blob: config.value.quiz?.sealedBlob ?? '',
          servedFieldIds: visibleFields.value
            .filter((field) => isGradableType(field.type) && field.id in submitData)
            .map((field) => field.id),
          answers: submitData,
          config: config.value,
          meta: {
            elapsedSeconds: attempt.elapsedSeconds.value,
            timedOut: attempt.timedOut.value,
          },
        },
        credentials.url,
      )
      return
    }

    const result = await sendToDiscord(config.value, submitData, formConfigStore.uploadedImages)
```

Keep the existing success/failure handling for the non-quiz branch, and wrap the quiz error in the existing `catch` by replacing it with:

```ts
  } catch (error) {
    showMessage(
      error instanceof Error ? error.message : 'Произошла неожиданная ошибка. Попробуйте еще раз.',
      'error',
    )
  } finally {
```

Add the remaining import: `import { isGradableType } from '../../services/quizPool'`.

`servedFieldIds` carries gradable served fields only. Non-gradable answers still travel inside
`answers`, and the worker validates the gradable count against the sealed `questionCount`.

- [ ] **Step 8: Run the tests and type check**

Run: `npm test && npx vue-tsc -b`
Expected: all PASS, no type errors.

- [ ] **Step 9: Verify end to end**

Run: `npm run worker:dev` in one terminal and `npm run dev` in another. Set the worker URL and author token in the editor panel.

Check, in order:
1. Build a 3-question quiz with a threshold of 2, copy the link, and confirm the URL contains no answer values and no `discord.com`.
2. Open the link in a private window, answer everything correctly, submit: the result screen shows `3/3` and Discord receives a green embed with the summary line.
3. Repeat with one wrong answer: the result screen shows the lower score and a red embed lists the failed question.
4. Set visibility to `none`, regenerate the link, submit: the candidate sees "Ответы отправлены" and no score, while Discord still shows everything.
5. Set a 5-second limit, wait it out: the form submits itself and Discord shows the timeout note.
6. Set `questionCount` to 2 with 3 questions in the pool: only two questions render, and grading reports `/2`.
7. Tamper with `servedFieldIds` in devtools to a single id and submit: the worker answers `400` and Discord receives nothing.

- [ ] **Step 10: Commit**

```bash
git add src/composables/useQuizAttempt.ts src/composables/useQuizAttempt.test.ts src/components/form/QuizTimer.vue src/components/form/QuizResult.vue src/components/form/FormView.vue
git commit -m "feat: add quiz taking flow with timer and result screen"
```

---

### Task 10: Styles and documentation

**Files:**
- Modify: the stylesheet that already defines `.editor-section` and `.checkbox-setting`
- Modify: `README.md`

**Interfaces:**
- Consumes: the class names introduced in Tasks 8 and 9: `.quiz-hint`, `.quiz-warning`, `.quiz-timer`, `.quiz-timer--urgent`, `.quiz-result`, `.quiz-result--passed`, `.quiz-result--failed`, `.quiz-breakdown`.
- Produces: no new interfaces.

- [ ] **Step 1: Locate the stylesheet**

Run: `grep -rln "\.editor-section" src/`

Add the quiz styles to the file that already owns the editor section styling, following its existing custom-property and dark-theme conventions.

- [ ] **Step 2: Style the new elements**

Required visual behaviour:
- `.quiz-hint` — muted small text.
- `.quiz-warning` — warning colour, readable in both themes.
- `.quiz-timer` — fixed or sticky in the form header; `.quiz-timer--urgent` switches to the danger colour.
- `.quiz-result` — centred card; `--passed` and `--failed` tint the border and heading.
- `.quiz-breakdown` — unstyled list, one row per question.

- [ ] **Step 3: Verify both themes**

Run: `npm run dev`
Check the quiz section, timer and both result states in light and dark theme.

- [ ] **Step 4: Document the feature**

In `README.md`, add a "Режим теста" section covering: what quiz mode does, that correct answers are sealed by the worker and never reach the candidate, that the answer key lives in `localStorage` and must be exported to JSON, the three result-visibility levels and the risk of `full`, and a pointer to `worker/README.md` for deployment. Add the quiz bullet to the возможности list.

- [ ] **Step 5: Run the full verification**

Run: `npm test && npx vue-tsc -b && npm run build`
Expected: all tests PASS, no type errors, build succeeds.

- [ ] **Step 6: Commit**

```bash
git add README.md src
git commit -m "feat: add quiz styles and documentation"
```

---

## Self-Review

**Spec coverage:**

| Spec section | Task |
|---|---|
| Public `QuizConfig`, sealed payload, type additions | 1 |
| Answer key never encoded into the URL | 1 (strip + test), 7 (share flow) |
| Exact-match grading, no partial credit | 2 |
| `servedFieldIds` validation against sealed `questionCount` | 2, 5 |
| AES-GCM sealing, `s1:` prefix, key rotation | 3 |
| Discord result block, failed-question list, verdict colour | 4 |
| `/seal` with author token, `/submit` with visibility trimming | 5 |
| Rate limiting binding | 5 |
| Reuse of `createDiscordEmbeds` in the worker | 5 |
| Client HTTP error mapping | 6 |
| Pool selection and shuffle | 6 |
| `localStorage` for answer key and worker credentials | 6, 7 |
| JSON export/import carrying the answer key | 7 |
| Editor quiz section, answer picker, `full` warning | 8 |
| Worker settings panel | 8 |
| Browser timer with auto-submit | 9 |
| Result screen per visibility level | 9 |
| Non-gradable answers passed through for manual review | 5, 9 |
| Documentation of the `localStorage` trade-off | 8 (UI warning), 10 (README) |

**Type consistency:** `SealedPayload`, `GradeResult`, `GradedQuestion`, `GradeOutcome`, `QuizSubmitResponse`, `SubmitRequest` and `WorkerCredentials` are defined once and imported everywhere else. `isGradableType` is the single source of truth for gradable types in the SPA; the worker keeps its own `GRADABLE_TYPES` set because it filters by string type on an untrusted payload.

**Known trade-offs carried from the spec:** the timer is client-side and defeatable; attempt limits are absent by design; a candidate can replay a sealed blob within the rate limit.
