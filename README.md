# Maths Engine

AI-powered exam evaluation system with a Bun backend and a separate frontend app.

The repository contains:
- a Bun + Express backend at the project root
- a Vite + React frontend in the `frontend/` folder
- Docker files for running both services together

## Requirements

Install these before running anything:
- Docker Desktop
- Bun 1.x
- Git
- an OpenAI API key
- a database connection string if your local run needs persistence

Check that Bun is installed:

```bash
bun --version
```

If Bun is missing:

Windows PowerShell:

```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```

macOS and Linux:

```bash
curl -fsSL https://bun.com/install | bash
```

## Clone The Repo

```bash
git clone https://github.com/smartcraze/maths-engine.git
cd maths-engine
```

## Environment Setup

Create a root `.env` file from the example:

```bash
copy .env.example .env
```

Set the values you need:

```env
NODE_ENV=development
PORT=3000
OPENAI_API_KEY=your_openai_key_here
DATABASE_URL=your_database_url_here
VITE_API_URL=http://localhost:3000
```

If you run the frontend locally, also install dependencies inside the frontend folder:

```bash
cd frontend
bun install
cd ..
```

## Local Run With Bun

Install root dependencies:

```bash
bun install
```

Start the backend:

```bash
bun run dev
```

The backend runs on:
- `http://localhost:3000`
- health check: `http://localhost:3000/health`

In another terminal, start the frontend:

```bash
cd frontend
bun run dev
```

The frontend runs on the Vite dev server, usually:
- `http://localhost:5173`

## Build And Run Locally

Backend build:

```bash
bun run build
```

Backend production start:

```bash
bun run start
```

Frontend build:

```bash
cd frontend
bun run build
```

Frontend preview:

```bash
cd frontend
bun run preview
```

## Run With Docker

Build both services:

```bash
docker-compose build
```

Start both services:

```bash
docker-compose up
```

Start in the background:

```bash
docker-compose up -d
```

Rebuild and start again:

```bash
docker-compose up --build
```

Stop everything:

```bash
docker-compose down
```

View logs:

```bash
docker-compose logs -f
```

With Docker, the usual ports are:
- backend: `http://localhost:3000`
- frontend: `http://localhost:5173`

## Helpful Commands

Root backend commands:

```bash
bun run lint
bun run check
bun run fix
bun run types
bun run studio
```

Frontend commands:

```bash
cd frontend
bun run lint
bun run build
bun run preview
```

## What The App Does

- exposes a backend API for grading and log analysis
- serves log data from the `logs/` folder
- loads files that start with `m00` and end with `.json`
- provides a frontend dashboard for score and log analysis

## Project Layout

```text
.
├── src/               # backend source
├── frontend/          # React/Vite frontend
├── public/            # static backend-served assets
├── logs/              # grading logs
├── data/              # sample input data
├── docker-compose.yml # Docker setup
└── Dockerfile.backend # backend image build
```

## Notes

- If Docker fails to build, check that `.env` exists and that both Bun and Docker are installed.
- If the frontend cannot reach the backend, confirm both containers are running on the same compose network.
- If you only want the backend, use `bun run dev` at the repo root.
- If you only want the frontend, use `cd frontend && bun run dev`.
