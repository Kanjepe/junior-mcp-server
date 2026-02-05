# Rate Limit Backoff Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** When Junior (OpenAI API) returns a rate limit error (HTTP 429), track the cooldown timestamp and return a helpful "rate limited, try again later" message instead of hammering the API.

**Architecture:** Add a simple in-memory rate limit tracker module (`src/api/rate-limit.ts`) that records when a 429 was received and for how long to back off (parsed from `Retry-After` header, defaulting to 60s). Before every `callJunior()` call, check if we're still in cooldown — if so, short-circuit with a descriptive error. The tracker is process-scoped (resets on server restart), keeping the implementation zero-dependency and stateless on disk.

**Tech Stack:** TypeScript, no new dependencies

---

### Task 1: Create the rate limit tracker module

**Files:**
- Create: `src/api/rate-limit.ts`

**Step 1: Create `src/api/rate-limit.ts` with the rate limiter**

```typescript
let rateLimitedUntil = 0;

/**
 * Record that we got rate-limited. Parses Retry-After header
 * (seconds or HTTP-date), defaults to 60s.
 */
export function recordRateLimit(retryAfterHeader: string | null): void {
	let delaySec = 60;

	if (retryAfterHeader) {
		const parsed = Number(retryAfterHeader);
		if (!Number.isNaN(parsed) && parsed > 0) {
			delaySec = parsed;
		} else {
			// Try parsing as HTTP-date
			const date = Date.parse(retryAfterHeader);
			if (!Number.isNaN(date)) {
				delaySec = Math.max(1, Math.ceil((date - Date.now()) / 1000));
			}
		}
	}

	rateLimitedUntil = Date.now() + delaySec * 1000;
}

/**
 * Check if we're currently rate-limited.
 * Returns null if OK, or an error message string if rate-limited.
 */
export function checkRateLimit(): string | null {
	if (Date.now() < rateLimitedUntil) {
		const remainingSec = Math.ceil((rateLimitedUntil - Date.now()) / 1000);
		return (
			`⏳ Junior is rate-limited by OpenAI. Try again in ~${remainingSec}s.\n` +
			"Tip: wait a bit before retrying, or use a different approach for now."
		);
	}
	return null;
}

/** Reset rate limit state (useful for testing). */
export function resetRateLimit(): void {
	rateLimitedUntil = 0;
}
```

**Step 2: Verify it compiles**

Run: `cd /Users/aigarssukurs/Projects/130db/junior && pnpm build`
Expected: Clean compilation with no errors

**Step 3: Commit**

```bash
git add src/api/rate-limit.ts
git commit -m "feat(api): Add rate limit tracker module"
```

---

### Task 2: Integrate rate limit tracking into `callJunior()`

**Files:**
- Modify: `src/api/openai.ts`

**Step 1: Add the pre-call check and post-error recording**

At the top of `src/api/openai.ts`, add import:
```typescript
import { checkRateLimit, recordRateLimit } from "./rate-limit.js";
```

In `callJunior()`, add the rate limit check as the very first thing:
```typescript
export async function callJunior(
	prompt: string,
	reasoningEffort: string,
	systemPrompt?: string,
): Promise<{ text: string; thinkingSummary: string; usage: string }> {
	// Check rate limit before making any API call
	const rateLimitMsg = checkRateLimit();
	if (rateLimitMsg) {
		throw new Error(rateLimitMsg);
	}

	const credentials = await resolveCredentials();
	// ... rest unchanged
```

In the error-handling block (where `!response.ok` is checked), add rate limit recording before throwing:
```typescript
	if (!response.ok) {
		const errorBody = await response.text();
		if (response.status === 429) {
			recordRateLimit(response.headers.get("retry-after"));
		}
		throw new Error(
			`Junior got rejected (${response.status}): ${errorBody}\n` +
				`Model: ${config.model} | Reasoning: ${reasoningEffort}`,
		);
	}
```

**Step 2: Verify it compiles**

Run: `cd /Users/aigarssukurs/Projects/130db/junior && pnpm build`
Expected: Clean compilation with no errors

**Step 3: Commit**

```bash
git add src/api/openai.ts
git commit -m "feat(api): Integrate rate limit check and recording into callJunior"
```

---

### Task 3: Update documentation

**Files:**
- Modify: `CLAUDE.md`
- Modify: `README.md` (if it exists and documents behavior)

**Step 1: Add rate limiting behavior to CLAUDE.md Architecture section**

Add a bullet to the "Key modules" list in CLAUDE.md:
```
3. **Rate Limiter** (`src/api/rate-limit.ts`) — In-memory rate limit tracker. Records 429 responses with `Retry-After` parsing, blocks subsequent calls until cooldown expires. Resets on server restart.
```

Update the architecture tree to include the new file:
```
  api/
    openai.ts               # callJunior(), formatResponse(), resolveCredentials()
    rate-limit.ts            # In-memory 429 rate limit tracker with Retry-After parsing
```

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: Document rate limit backoff behavior"
```
