# maths-engine

Current implemented scope in this repository:
- HTTP server with health endpoint
- Question-type routing engine (algebra, calculus, proof, mcq)
- OpenRouter-powered model routing with structured outputs

Future stages (rubric loading, dual-pass judging, consensus, and full eval runner) are scaffolded in architecture/docs but not fully wired in the current API surface yet.

## Prerequisites

Install these before running the project:

- Bun 
- OpenRouter API key
- Optional: VS Code with Biome extension

Check your Bun version:

```bash
bun --version
```
Install if not available
- Linux
```bash
curl -fsSL https://bun.com/install | bash
```
- Window powershell

```bash
powershell -c "irm bun.sh/install.ps1|iex"
```


## Clone and Install

```bash
git clone https://github.com/smartcraze/maths-engine.git
cd maths-engine
bun install
```

## Environment Setup

Create a `.env` file in the project root:

```env
NODE_ENV=development
PORT=3000

OPENROUTER_API_KEY=your_openrouter_api_key_here

LOG_LEVEL=info
ROUTER_MODEL=openai/gpt-4o-mini
JUDGE_PASS1_MODEL=anthropic/claude-sonnet-4-5
JUDGE_PASS2_MODEL=openai/gpt-4o
TIEBREAKER_MODEL=anthropic/claude-opus-4-5
CONSENSUS_THRESHOLD=1
```

Notes:
- `OPENROUTER_API_KEY` is required.
- If model variables are omitted, defaults in `src/config/models.ts` are used.
- Environment validation is defined in `src/config/env.ts`.

## Run the Project

Start dev server:

```bash
bun run dev
```

Build production bundle:

```bash
bun run build
```

Build and run compiled output:

```bash
bun run start
```

## Available Scripts

- `bun run dev` - run the server in development
- `bun run build` - bundle server to `dist/`
- `bun run start` - build then run production output
- `bun run format` - format files using Biome
- `bun run lint` - lint with Biome
- `bun run check` - run Biome checks
- `bun run check:fix` - apply safe Biome fixes
- `bun run prepare` - initialize Husky hooks

## API Endpoints (Current)

### GET /health

Health check endpoint.

Example:

```bash
curl http://localhost:3000/health
```

Example response:

```json
{
	"success": true,
	"message": "OK",
	"data": {
		"status": "healthy"
	}
}
```

## Project Structure

```text
src/
	index.ts                 # Express app and middleware setup
	server.ts                # Server bootstrap and shutdown handlers
	config/
		env.ts                 # Environment schema and parsing
		models.ts              # Model registry by role
		open-router.ts         # OpenRouter model provider helpers
	modules/
		engine/
			router.ts            # LLM-based question type classifier
			index.ts             # Engine entry for routing stage
	types/
		index.ts               # Shared Zod schemas and TypeScript types
```

## Development Notes


- Runtime is Bun, not Node. Use `bun` commands throughout.
- Keep model IDs in `src/config/models.ts` (avoid hardcoding in modules).
- Use structured outputs for model responses (Zod schemas in `src/types/index.ts`).
- Linting and formatting are enforced with Biome.

## Troubleshooting

### Missing environment variable warnings

If startup prints env warnings, verify your `.env` matches `src/config/env.ts`.

### OpenRouter authentication errors

- Ensure `OPENROUTER_API_KEY` is valid.
- Confirm the selected model IDs are accessible in your OpenRouter account.

### Port already in use

Change `PORT` in `.env` and restart:

```env
PORT=3001
```

## Contributing

Before opening a PR:

```bash
bun run check
bun run build
```

If checks fail due to formatting/lint issues:

```bash
bun run check:fix
```
