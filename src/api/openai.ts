import { CHATGPT_API_URL, OPENAI_API_URL } from "../auth/constants.js";
import { extractAccountId } from "../auth/jwt.js";
import { refreshAccessToken } from "../auth/oauth.js";
import {
	loadTokens,
	type StoredTokens,
	saveTokens,
} from "../auth/token-store.js";

// Resolve config from env vars with defaults
export const config = {
	model: process.env.JUNIOR_MODEL ?? "gpt-5.2-codex",
	reasoningEffort: process.env.JUNIOR_REASONING ?? "high",
};

export interface OpenAIResponse {
	id: string;
	output: Array<{
		type: string;
		id?: string;
		content?: Array<{ type: string; text?: string }>;
		summary?: Array<{ type: string; text?: string }>;
	}>;
	usage?: {
		input_tokens: number;
		output_tokens: number;
		total_tokens: number;
	};
}

interface Credentials {
	apiUrl: string;
	headers: Record<string, string>;
	extraBody: Record<string, unknown>;
}

async function resolveCredentials(): Promise<Credentials> {
	// 1. Env var takes precedence
	const apiKey = process.env.OPENAI_API_KEY;
	if (apiKey) {
		return {
			apiUrl: OPENAI_API_URL,
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
			},
			extraBody: {},
		};
	}

	// 2. OAuth tokens
	let tokens: StoredTokens | null = await loadTokens();
	if (!tokens) {
		throw new Error(
			"No credentials found. Either:\n" +
				"  1. Set OPENAI_API_KEY environment variable, or\n" +
				"  2. Run `junior auth login` to authenticate via OpenAI OAuth",
		);
	}

	// Auto-refresh if expiring within 60 seconds
	if (Date.now() >= (tokens.expires_at - 60) * 1000) {
		const refreshed = await refreshAccessToken(tokens.refresh_token);
		tokens = {
			access_token: refreshed.access_token,
			refresh_token: refreshed.refresh_token,
			expires_at: Math.floor(Date.now() / 1000) + refreshed.expires_in,
			chatgpt_account_id: extractAccountId(refreshed.access_token),
		};
		await saveTokens(tokens);
	}

	return {
		apiUrl: CHATGPT_API_URL,
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${tokens.access_token}`,
			"Chatgpt-Account-Id": tokens.chatgpt_account_id,
		},
		extraBody: { store: false },
	};
}

export async function callJunior(
	prompt: string,
	reasoningEffort: string,
	systemPrompt?: string,
): Promise<{ text: string; thinkingSummary: string; usage: string }> {
	const credentials = await resolveCredentials();

	const input: Array<Record<string, unknown>> = [];

	if (systemPrompt) {
		input.push({ role: "developer", content: systemPrompt });
	}

	input.push({ role: "user", content: prompt });

	const body: Record<string, unknown> = {
		model: config.model,
		input,
		reasoning: { effort: reasoningEffort },
		...credentials.extraBody,
	};

	const response = await fetch(credentials.apiUrl, {
		method: "POST",
		headers: credentials.headers,
		body: JSON.stringify(body),
	});

	if (!response.ok) {
		const errorBody = await response.text();
		throw new Error(
			`Junior got rejected (${response.status}): ${errorBody}\n` +
				`Model: ${config.model} | Reasoning: ${reasoningEffort}`,
		);
	}

	const data = (await response.json()) as OpenAIResponse;

	let text = "";
	let thinkingSummary = "";

	for (const block of data.output) {
		if (block.type === "message" && block.content) {
			for (const part of block.content) {
				if (part.type === "output_text" && part.text) {
					text += part.text;
				}
			}
		}
		if (block.type === "reasoning" && block.summary) {
			for (const part of block.summary) {
				if (part.type === "summary_text" && part.text) {
					thinkingSummary += part.text;
				}
			}
		}
	}

	const usage = data.usage
		? `tokens: ${data.usage.input_tokens} in → ${data.usage.output_tokens} out (${data.usage.total_tokens} total)`
		: "usage: unknown";

	return { text, thinkingSummary, usage };
}

export function formatResponse(
	text: string,
	thinkingSummary: string,
	usage: string,
	effort: string,
): string {
	const parts: string[] = [];

	if (thinkingSummary) {
		parts.push(`🧠 Junior's thinking (${effort}):\n${thinkingSummary}`);
	}

	parts.push(`💬 Junior says:\n${text}`);
	parts.push(`📊 ${usage}`);

	return parts.join("\n\n---\n\n");
}
