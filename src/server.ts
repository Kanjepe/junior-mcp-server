import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { callJunior, config, formatResponse } from "./api/openai.js";

const server = new McpServer({
	name: "junior-mcp-server",
	version: "1.0.0",
});

// === Tool 1: ask_junior ===

server.registerTool(
	"ask_junior",
	{
		title: "Ask Junior",
		description: `Send a task to Junior, your OpenAI-powered intern (${config.model}).
Junior uses extended thinking (reasoning effort: configurable) to work through problems carefully.

Great for:
- Getting a second opinion on code, architecture, or bugs
- Offloading research or analysis tasks
- Having Junior think through complex problems step-by-step
- Code review from a different model's perspective

Args:
  - prompt (string): What you want Junior to work on
  - reasoning_effort (string): How hard Junior should think — "low", "medium", "high", or "xhigh" (default: "${config.reasoningEffort}")
  - system_prompt (string, optional): Extra instructions for Junior's behavior

Returns: Junior's response with thinking summary and token usage.`,
		inputSchema: {
			prompt: z
				.string()
				.min(1, "Give Junior something to work on!")
				.describe("The task or question for Junior"),
			reasoning_effort: z
				.enum(["low", "medium", "high", "xhigh"])
				.default(config.reasoningEffort as "low" | "medium" | "high" | "xhigh")
				.describe("How hard Junior should think"),
			system_prompt: z
				.string()
				.optional()
				.describe("Optional system/developer instructions for Junior"),
		},
		annotations: {
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: false,
			openWorldHint: true,
		},
	},
	async (params) => {
		try {
			const effort = params.reasoning_effort ?? config.reasoningEffort;
			const result = await callJunior(
				params.prompt,
				effort,
				params.system_prompt,
			);

			return {
				content: [
					{
						type: "text" as const,
						text: formatResponse(
							result.text,
							result.thinkingSummary,
							result.usage,
							effort,
						),
					},
				],
			};
		} catch (error: unknown) {
			const msg = error instanceof Error ? error.message : String(error);
			return {
				content: [{ type: "text" as const, text: `❌ Junior failed: ${msg}` }],
				isError: true,
			};
		}
	},
);

// === Tool 2: junior_review ===

server.registerTool(
	"junior_review",
	{
		title: "Junior Code Review",
		description: `Have Junior do a code review with deep thinking.
Junior will analyze the code for bugs, security issues, performance problems, and style.
Always uses "high" reasoning effort for thorough analysis.

Args:
  - code (string): The code to review
  - language (string, optional): Programming language for context
  - focus (string, optional): What to focus on — e.g., "security", "performance", "readability"

Returns: Detailed code review with thinking process.`,
		inputSchema: {
			code: z.string().min(1).describe("The code to review"),
			language: z
				.string()
				.optional()
				.describe('Programming language (e.g., "typescript", "python")'),
			focus: z
				.string()
				.optional()
				.describe(
					'Review focus area (e.g., "security", "performance", "readability")',
				),
		},
		annotations: {
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	async (params) => {
		const langHint = params.language ? ` (${params.language})` : "";
		const focusHint = params.focus
			? `\nFocus especially on: ${params.focus}`
			: "";

		const systemPrompt =
			"You are a senior code reviewer. Be thorough, specific, and constructive. " +
			"Point out bugs, security issues, performance problems, and suggest improvements. " +
			"Use code examples in your suggestions.";

		const prompt = `Review this code${langHint}:${focusHint}\n\n\`\`\`\n${params.code}\n\`\`\``;

		try {
			const result = await callJunior(prompt, "high", systemPrompt);
			return {
				content: [
					{
						type: "text" as const,
						text: formatResponse(
							result.text,
							result.thinkingSummary,
							result.usage,
							"high",
						),
					},
				],
			};
		} catch (error: unknown) {
			const msg = error instanceof Error ? error.message : String(error);
			return {
				content: [
					{
						type: "text" as const,
						text: `❌ Junior's review failed: ${msg}`,
					},
				],
				isError: true,
			};
		}
	},
);

// === Tool 3: junior_brainstorm ===

server.registerTool(
	"junior_brainstorm",
	{
		title: "Junior Brainstorm",
		description: `Have Junior brainstorm ideas with maximum thinking power (xhigh reasoning).
Great for architecture decisions, naming things, or exploring approaches.

Args:
  - topic (string): What to brainstorm about
  - constraints (string, optional): Any constraints or requirements to consider

Returns: Creative ideas with deep reasoning process visible.`,
		inputSchema: {
			topic: z.string().min(1).describe("What to brainstorm about"),
			constraints: z
				.string()
				.optional()
				.describe("Any constraints or requirements"),
		},
		annotations: {
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: false,
			openWorldHint: true,
		},
	},
	async (params) => {
		const constraintHint = params.constraints
			? `\n\nConstraints to consider:\n${params.constraints}`
			: "";

		const systemPrompt =
			"You are a creative technical thinker. Generate multiple diverse approaches. " +
			"For each idea, explain the tradeoffs. Be bold and creative, but practical. " +
			"Rank your suggestions by what you'd actually recommend.";

		const prompt = `Brainstorm: ${params.topic}${constraintHint}`;

		try {
			const result = await callJunior(prompt, "xhigh", systemPrompt);
			return {
				content: [
					{
						type: "text" as const,
						text: formatResponse(
							result.text,
							result.thinkingSummary,
							result.usage,
							"xhigh",
						),
					},
				],
			};
		} catch (error: unknown) {
			const msg = error instanceof Error ? error.message : String(error);
			return {
				content: [
					{
						type: "text" as const,
						text: `❌ Junior's brainstorm failed: ${msg}`,
					},
				],
				isError: true,
			};
		}
	},
);

export async function startServer(): Promise<void> {
	const transport = new StdioServerTransport();
	await server.connect(transport);
	console.error(
		"🧑‍💻 Junior is ready! Model:",
		config.model,
		"| Default reasoning:",
		config.reasoningEffort,
	);
}
