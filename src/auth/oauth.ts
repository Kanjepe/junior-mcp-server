import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
	OAUTH_AUTHORIZE_URL,
	OAUTH_CLIENT_ID,
	OAUTH_REDIRECT_URI,
	OAUTH_SCOPES,
	OAUTH_TOKEN_URL,
} from "./constants.js";

export interface PkceChallenge {
	verifier: string;
	challenge: string;
}

export function generatePkce(): PkceChallenge {
	const verifier = randomBytes(32).toString("base64url");
	const challenge = createHash("sha256").update(verifier).digest("base64url");
	return { verifier, challenge };
}

export function generateState(): string {
	return randomUUID();
}

export function buildAuthorizationUrl(
	state: string,
	challenge: string,
): string {
	const params = new URLSearchParams({
		response_type: "code",
		client_id: OAUTH_CLIENT_ID,
		redirect_uri: OAUTH_REDIRECT_URI,
		scope: OAUTH_SCOPES,
		state,
		code_challenge: challenge,
		code_challenge_method: "S256",
		audience: "https://api.openai.com/v1",
	});
	return `${OAUTH_AUTHORIZE_URL}?${params.toString()}`;
}

interface TokenResponse {
	access_token: string;
	refresh_token: string;
	expires_in: number;
}

export async function exchangeCodeForTokens(
	code: string,
	verifier: string,
): Promise<TokenResponse> {
	const response = await fetch(OAUTH_TOKEN_URL, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			grant_type: "authorization_code",
			client_id: OAUTH_CLIENT_ID,
			code,
			redirect_uri: OAUTH_REDIRECT_URI,
			code_verifier: verifier,
		}),
	});

	if (!response.ok) {
		const body = await response.text();
		throw new Error(`Token exchange failed (${response.status}): ${body}`);
	}

	return (await response.json()) as TokenResponse;
}

export async function refreshAccessToken(
	refreshToken: string,
): Promise<TokenResponse> {
	const response = await fetch(OAUTH_TOKEN_URL, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			grant_type: "refresh_token",
			client_id: OAUTH_CLIENT_ID,
			refresh_token: refreshToken,
		}),
	});

	if (!response.ok) {
		const body = await response.text();
		throw new Error(`Token refresh failed (${response.status}): ${body}`);
	}

	return (await response.json()) as TokenResponse;
}
