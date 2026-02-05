#!/usr/bin/env node

import {
	handleAuthLogin,
	handleAuthLogout,
	handleAuthStatus,
} from "./cli/auth.js";
import { startServer } from "./server.js";

const args = process.argv.slice(2);

async function main(): Promise<void> {
	const command = args.join(" ");

	switch (command) {
		case "auth login":
			await handleAuthLogin();
			break;
		case "auth logout":
			await handleAuthLogout();
			break;
		case "auth status":
			await handleAuthStatus();
			break;
		case "":
			// No args — start MCP server (default behavior)
			await startServer();
			break;
		default:
			console.error(`Unknown command: ${command}`);
			console.error("\nUsage:");
			console.error("  junior              Start MCP server (default)");
			console.error("  junior auth login   Login via OpenAI OAuth");
			console.error("  junior auth logout  Clear stored credentials");
			console.error("  junior auth status  Show current auth method");
			process.exit(1);
	}
}

main().catch((error: unknown) => {
	console.error(
		"Junior failed:",
		error instanceof Error ? error.message : error,
	);
	process.exit(1);
});
