import { exec } from "node:child_process";
import { createServer } from "node:http";
import { platform } from "node:os";
import { OAUTH_CALLBACK_PORT } from "../auth/constants.js";
import { extractAccountId } from "../auth/jwt.js";
import {
	buildAuthorizationUrl,
	exchangeCodeForTokens,
	generatePkce,
	generateState,
} from "../auth/oauth.js";
import { clearTokens, loadTokens, saveTokens } from "../auth/token-store.js";

function openBrowser(url: string): void {
	const os = platform();
	const cmd = os === "darwin" ? "open" : os === "win32" ? "start" : "xdg-open";
	exec(`${cmd} "${url}"`);
}

const SUCCESS_HTML = `<!DOCTYPE html>
<html><head><title>Junior Auth</title></head>
<body style="font-family:system-ui;text-align:center;padding:4rem">
<h1>Authenticated!</h1>
<p>You can close this tab and return to the terminal.</p>
</body></html>`;

const ERROR_HTML = (msg: string) => `<!DOCTYPE html>
<html><head><title>Junior Auth</title></head>
<body style="font-family:system-ui;text-align:center;padding:4rem">
<h1>Authentication Failed</h1>
<p>${msg}</p>
</body></html>`;

export async function handleAuthLogin(): Promise<void> {
	const { verifier, challenge } = generatePkce();
	const state = generateState();
	const authUrl = buildAuthorizationUrl(state, challenge);

	const { code } = await new Promise<{ code: string }>((resolve, reject) => {
		const timeout = setTimeout(() => {
			httpServer.close();
			reject(new Error("Login timed out after 120 seconds"));
		}, 120_000);

		const httpServer = createServer((req, res) => {
			const url = new URL(
				req.url ?? "/",
				`http://localhost:${OAUTH_CALLBACK_PORT}`,
			);

			if (url.pathname !== "/auth/callback") {
				res.writeHead(404);
				res.end("Not found");
				return;
			}

			const error = url.searchParams.get("error");
			if (error) {
				const desc = url.searchParams.get("error_description") ?? error;
				res.writeHead(400, { "Content-Type": "text/html" });
				res.end(ERROR_HTML(desc));
				clearTimeout(timeout);
				httpServer.close();
				reject(new Error(`OAuth error: ${desc}`));
				return;
			}

			const returnedState = url.searchParams.get("state");
			if (returnedState !== state) {
				res.writeHead(400, { "Content-Type": "text/html" });
				res.end(ERROR_HTML("State mismatch — possible CSRF attack."));
				clearTimeout(timeout);
				httpServer.close();
				reject(new Error("OAuth state mismatch"));
				return;
			}

			const authCode = url.searchParams.get("code");
			if (!authCode) {
				res.writeHead(400, { "Content-Type": "text/html" });
				res.end(ERROR_HTML("No authorization code received."));
				clearTimeout(timeout);
				httpServer.close();
				reject(new Error("No authorization code in callback"));
				return;
			}

			res.writeHead(200, { "Content-Type": "text/html" });
			res.end(SUCCESS_HTML);
			clearTimeout(timeout);
			httpServer.close();
			resolve({ code: authCode });
		});

		httpServer.listen(OAUTH_CALLBACK_PORT, () => {
			console.log("Opening browser for OpenAI login...");
			openBrowser(authUrl);
			console.log(`\nIf the browser didn't open, visit:\n${authUrl}\n`);
			console.log("Waiting for authentication...");
		});
	});

	console.log("Exchanging code for tokens...");
	const tokenResponse = await exchangeCodeForTokens(code, verifier);

	const accountId = extractAccountId(tokenResponse.access_token);

	await saveTokens({
		access_token: tokenResponse.access_token,
		refresh_token: tokenResponse.refresh_token,
		expires_at: Math.floor(Date.now() / 1000) + tokenResponse.expires_in,
		chatgpt_account_id: accountId,
	});

	console.log("Logged in successfully!");
	console.log(`Account ID: ${accountId}`);
}

export async function handleAuthLogout(): Promise<void> {
	await clearTokens();
	console.log("Logged out. OAuth tokens cleared.");
}

export async function handleAuthStatus(): Promise<void> {
	if (process.env.OPENAI_API_KEY) {
		console.log("Auth method: OPENAI_API_KEY environment variable");
		console.log("API endpoint: api.openai.com/v1/responses (standard)");
		return;
	}

	const tokens = await loadTokens();
	if (tokens) {
		const expired = Date.now() >= tokens.expires_at * 1000;
		console.log("Auth method: OpenAI OAuth (ChatGPT subscription)");
		console.log("API endpoint: chatgpt.com/backend-api/codex/responses");
		console.log(`Account ID: ${tokens.chatgpt_account_id}`);
		console.log(
			`Token status: ${expired ? "expired (will refresh on next use)" : "valid"}`,
		);
		return;
	}

	console.log("Not authenticated.");
	console.log("\nTo authenticate, either:");
	console.log("  1. Set OPENAI_API_KEY environment variable");
	console.log("  2. Run: junior auth login");
}
