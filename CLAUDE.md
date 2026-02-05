# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run Commands

```bash
pnpm install          # Install dependencies
pnpm build            # Compile TypeScript → dist/
pnpm start            # Run the compiled MCP server (dist/index.js)
pnpm dev              # Watch mode — rebuild on file changes
```

No test or lint tooling is configured yet.

## What This Project Is

Junior is an MCP (Model Context Protocol) server that acts as a sidecar to Claude Code — delegating tasks to OpenAI's GPT-5.2-Codex with extended thinking. It exposes three tools over stdio:

| Tool | Purpose | Reasoning Effort |
|------|---------|-----------------|
| `ask_junior` | General-purpose task delegation | Configurable (default: high) |
| `junior_review` | Code review with senior-reviewer system prompt | Fixed: high |
| `junior_brainstorm` | Creative brainstorming | Fixed: xhigh (maximum) |

## Architecture

Single-file server: `src/index.ts` → compiled to `dist/index.js`.

The file is organized into four sections:
1. **Config** — reads `OPENAI_API_KEY`, `JUNIOR_MODEL`, `JUNIOR_REASONING` from env vars
2. **OpenAI caller** (`callJunior`) — direct HTTP to `/v1/responses` endpoint, parses output text + thinking summaries + token usage
3. **Formatter** (`formatResponse`) — assembles thinking summary, answer, and usage stats
4. **MCP server** — registers the three tools with Zod input schemas and tool annotations, then connects via `StdioServerTransport`

## Key Conventions

- **ES Modules** — `"type": "module"` in package.json, ES2022 target/module
- **Strict TypeScript** — strict mode enabled in tsconfig
- **No bundler** — plain `tsc` compilation
- **Tool annotations** — each tool declares `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`
- **Error handling** — all tool handlers wrap in try/catch and return `isError: true` on failure
- **OpenAI "developer" role** — system prompts use `role: "developer"` (not "system") per OpenAI Responses API

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | Yes | — | OpenAI API key |
| `JUNIOR_MODEL` | No | `gpt-5.2-codex` | Model to use |
| `JUNIOR_REASONING` | No | `high` | Default reasoning effort (`low`/`medium`/`high`/`xhigh`) |

## Claude Code Integration

```bash
claude mcp add junior \
  --env OPENAI_API_KEY=sk-your-key \
  -- node /absolute/path/to/dist/index.js
```

### Git Commit & Pull Request Guidelines

Pattern: `<type>(<optional scope>)!: <Capitalized description>`
Regex: `^(feat|fix|perf|test|docs|refactor|build|ci|chore|revert)(\([a-zA-Z0-9 ]+\))?!?: [A-Z].+[^.]$`

- Commit messages MUST be single-line only: just the title, no body, no blank lines.
- Format: `<type>(<optional scope>)!: <Capitalized description>` with allowed types `feat`, `fix`, `perf`, `test`, `docs`, `refactor`, `build`, `ci`, `chore`, `revert`.
- Use `!` before colon only for breaking changes. Keep descriptions capitalized without trailing period.
- Example: `feat(api): Add category filter`
- Do NOT append `Co-Authored-By` or any other trailers to commit messages.
- PRs should include: summary, linked issues, steps to test, notes on migrations, config changes.
- CI readiness: ensure `pytest` and `ruff check .` pass locally before requesting review.

## Rules

- After implementing or removing any feature, update relevant documentation like README.md or CLAUDE.md.
- Use Biome for formatting and linting, never ESLint
- Use pnpm, never npm or yarn