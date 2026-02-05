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
