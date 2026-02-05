import { chmod, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { TOKEN_DIR, TOKEN_PATH } from "./constants.js";

export interface StoredTokens {
	access_token: string;
	refresh_token: string;
	expires_at: number;
	chatgpt_account_id: string;
}

export async function loadTokens(): Promise<StoredTokens | null> {
	try {
		const raw = await readFile(TOKEN_PATH, "utf-8");
		return JSON.parse(raw) as StoredTokens;
	} catch {
		return null;
	}
}

export async function saveTokens(tokens: StoredTokens): Promise<void> {
	await mkdir(TOKEN_DIR, { recursive: true });
	await writeFile(TOKEN_PATH, JSON.stringify(tokens, null, 2), "utf-8");
	await chmod(TOKEN_PATH, 0o600);
}

export async function clearTokens(): Promise<void> {
	try {
		await unlink(TOKEN_PATH);
	} catch {
		// File doesn't exist — nothing to clear
	}
}
