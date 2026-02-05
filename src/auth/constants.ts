import { homedir } from "node:os";
import { join } from "node:path";

// OpenAI OAuth endpoints (same as Codex CLI)
export const OAUTH_AUTHORIZE_URL = "https://auth.openai.com/oauth/authorize";
export const OAUTH_TOKEN_URL = "https://auth.openai.com/oauth/token";
export const OAUTH_CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
export const OAUTH_SCOPES = "openid profile email offline_access";
export const OAUTH_REDIRECT_URI = "http://localhost:1455/auth/callback";
export const OAUTH_CALLBACK_PORT = 1455;

// API endpoints
export const OPENAI_API_URL = "https://api.openai.com/v1/responses";
export const CHATGPT_API_URL =
	"https://chatgpt.com/backend-api/codex/responses";

// Token storage
export const TOKEN_DIR = join(homedir(), ".junior");
export const TOKEN_PATH = join(TOKEN_DIR, "auth.json");
