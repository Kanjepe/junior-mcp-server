# 🧑‍💻 Junior — Your OpenAI Intern Inside Claude Code

> "Hey Junior, go figure this out..."

**Junior** is an MCP server that gives Claude Code a sidekick — an OpenAI-powered intern (GPT-5.2-Codex) with extended thinking enabled. Delegate tasks, get second opinions, and let Junior do the heavy lifting while Claude stays in charge.

## Why?

Because two brains are better than one. Claude is your lead dev. Junior is the eager intern who thinks really hard before answering.

## Tools

| Tool | What it does | Reasoning |
|------|-------------|-----------|
| `ask_junior` | General-purpose — ask Junior anything | Configurable (default: high) |
| `junior_review` | Code review with deep analysis | Always high |
| `junior_brainstorm` | Creative brainstorming mode | Always xhigh (maximum thinking) |
| `junior_fetch` | Fetch a web page and analyze its content | Always medium |

## Authentication

Junior supports two authentication methods:

### Option 1: API Key (standard)

Set your OpenAI API key as an environment variable:

```bash
export OPENAI_API_KEY=sk-your-key
```

Uses the standard OpenAI API (`api.openai.com/v1/responses`).

### Option 2: OpenAI OAuth (ChatGPT Plus/Pro subscription)

Log in with your OpenAI account — no API key needed:

```bash
junior auth login
```

This opens your browser for OpenAI's OAuth flow (same as Codex CLI). Tokens are stored in `~/.junior/auth.json`. Uses the ChatGPT backend (`chatgpt.com/backend-api/codex/responses`).

### Auth Precedence

1. `OPENAI_API_KEY` env var (if set, always used)
2. OAuth tokens from `junior auth login`
3. Error with instructions for both options

### CLI Commands

```bash
junior auth login    # Log in via OpenAI OAuth (opens browser)
junior auth logout   # Clear stored OAuth tokens
junior auth status   # Show current authentication method
```

## Setup

### 1. Build it

```bash
cd junior-mcp-server
pnpm install
pnpm build
```

### 2. Add to Claude Code

With API key:

```bash
claude mcp add junior \
  --env OPENAI_API_KEY=sk-your-key \
  -- node /absolute/path/to/junior-mcp-server/dist/index.js
```

With OAuth (after running `junior auth login`):

```bash
claude mcp add junior \
  -- node /absolute/path/to/junior-mcp-server/dist/index.js
```

### 3. Verify

Inside Claude Code:
```
/mcp
```
You should see `junior` connected.

## Usage

Just talk to Claude Code naturally:

- *"ask junior to review this function"*
- *"have junior brainstorm a caching strategy for this API"*
- *"ask junior what it thinks about this architecture"*
- *"get junior to think hard about how to optimize this query"*
- *"ask junior to fetch https://example.com and get the first headline"*

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | (optional) | OpenAI API key. If not set, uses OAuth tokens |
| `JUNIOR_MODEL` | `gpt-5.2-codex` | Which OpenAI model Junior uses |
| `JUNIOR_REASONING` | `high` | Default reasoning effort: `low`, `medium`, `high`, `xhigh` |

## Example: Switch to a cheaper model for simple tasks

```bash
claude mcp add junior-fast \
  --env OPENAI_API_KEY=sk-your-key \
  --env JUNIOR_MODEL=gpt-5.2 \
  --env JUNIOR_REASONING=medium \
  -- node /path/to/junior-mcp-server/dist/index.js
```

Now you have both `junior` (heavy thinker) and `junior-fast` (quick answers).

## License

MIT — go wild.
