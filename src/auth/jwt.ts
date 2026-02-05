/**
 * Decode the payload segment of a JWT without verifying the signature.
 * Zero dependencies — uses Node.js Buffer for base64url decoding.
 */
export function decodeJwtPayload(token: string): Record<string, unknown> {
	const parts = token.split(".");
	if (parts.length !== 3) {
		throw new Error("Invalid JWT: expected 3 segments");
	}

	const payload = parts[1];
	const json = Buffer.from(payload, "base64url").toString("utf-8");
	return JSON.parse(json) as Record<string, unknown>;
}

/**
 * Extract the ChatGPT account ID from an OpenAI OAuth access token.
 * The ID lives at `["https://api.openai.com/auth"]["chatgpt_account_id"]`.
 */
export function extractAccountId(token: string): string {
	const payload = decodeJwtPayload(token);

	const authClaim = payload["https://api.openai.com/auth"];
	if (
		typeof authClaim === "object" &&
		authClaim !== null &&
		"chatgpt_account_id" in authClaim
	) {
		const accountId = (authClaim as Record<string, unknown>).chatgpt_account_id;
		if (typeof accountId === "string" && accountId.length > 0) {
			return accountId;
		}
	}

	throw new Error(
		"Could not extract chatgpt_account_id from access token. " +
			"Ensure you are logging in with a ChatGPT Plus/Pro account.",
	);
}
