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
| `junior_fetch` | Fetch a web page and analyze its content | Fixed: medium |

## Architecture

Modular structure compiled to `dist/` via `tsc`:

```
src/
  index.ts                  # CLI dispatcher: no args → MCP server, auth subcommands → CLI
  server.ts                 # MCP server + 3 tool registrations, exports startServer()
  auth/
    constants.ts            # OAuth endpoints, client ID, scopes, API URLs, token paths
    jwt.ts                  # JWT decode (zero deps, uses Buffer)
    token-store.ts          # Read/write ~/.junior/auth.json
    oauth.ts                # PKCE helpers: build URL, exchange code, refresh tokens
  api/
    openai.ts               # callJunior(), formatResponse(), resolveCredentials()
  cli/
    auth.ts                 # login/logout/status command handlers
```

Key modules:
1. **API** (`src/api/openai.ts`) — `resolveCredentials()` picks auth method (env var → standard API, OAuth tokens → ChatGPT backend), `callJunior()` makes the HTTP call, `formatResponse()` assembles output
2. **Auth** (`src/auth/`) — OAuth PKCE flow, JWT decoding, token storage in `~/.junior/auth.json`
3. **MCP server** (`src/server.ts`) — registers three tools with Zod schemas and tool annotations, connects via `StdioServerTransport`
4. **CLI** (`src/cli/auth.ts`) — `junior auth login` opens browser for OAuth, `junior auth logout` clears tokens, `junior auth status` shows current method

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
| `OPENAI_API_KEY` | No | — | OpenAI API key. If not set, uses OAuth tokens from `junior auth login` |
| `JUNIOR_MODEL` | No | `gpt-5.2-codex` | Model to use |
| `JUNIOR_REASONING` | No | `high` | Default reasoning effort (`low`/`medium`/`high`/`xhigh`) |

## Claude Code Integration

With API key:
```bash
claude mcp add junior \
  --env OPENAI_API_KEY=sk-your-key \
  -- node /absolute/path/to/dist/index.js
```

With OAuth (after `junior auth login`):
```bash
claude mcp add junior \
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