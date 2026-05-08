# Database Setup Guide

## Quick Start

### 1. Ensure PostgreSQL is Running

**Option A: Local PostgreSQL**
```bash
# On Windows, ensure PostgreSQL service is running
# On Mac:
brew services start postgresql
# On Linux:
sudo systemctl start postgresql
```

**Option B: Docker Compose**
```bash
docker-compose up -d postgres
# Wait 3-5 seconds for DB to initialize
```

### 2. Set DATABASE_URL in .env
```bash
# Example for local PostgreSQL
DATABASE_URL="postgresql://postgres:password@localhost:5432/maths_engine"

# Example for Docker Postgres
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/maths_engine"
```

### 3. Generate & Apply Migrations
```bash
# Generate migration (creates new migration file from schema changes)
bun run drizzle-kit generate

# Apply migration to database
bun run drizzle-kit migrate
```

### 4. Verify Setup
```bash
# Open Drizzle Studio to inspect database
bun run studio
# Opens at http://localhost:3001
```

### 5. Start Server
```bash
bun run dev
```

---

## Troubleshooting

### Error: `connect ECONNREFUSED 127.0.0.1:5432`
- PostgreSQL is not running
- Check: `sudo systemctl status postgresql` (Linux) or Services (Windows)
- Or use Docker: `docker-compose up -d postgres`

### Error: `FATAL: database "maths_engine" does not exist`
- Database not created yet
- Create it: `createdb maths_engine`
- Or use Docker Compose (it creates it automatically)

### Error: `Authentication failed for user "postgres"`
- Check DATABASE_URL credentials
- Verify PostgreSQL password

### Migrations not applying
```bash
# Reset & re-apply (DEV ONLY - loses all data)
bun run drizzle-kit drop
bun run drizzle-kit generate
bun run drizzle-kit migrate
```

---

## Docker Setup (Recommended for Development)

### docker-compose.yml already configured:
```yaml
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: maths_engine
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Commands:
```bash
# Start database
docker-compose up -d postgres

# View logs
docker-compose logs -f postgres

# Stop database
docker-compose down

# Stop and delete data
docker-compose down -v
```

---

## Verify Everything Works

### 1. Test Server Health
```bash
curl http://localhost:3000/health
# Expected: { "success": true, "data": { "status": "healthy" } }
```

### 2. Test OCR Endpoint
```bash
curl -X POST http://localhost:3000/api/ocr \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "test.pdf",
    "mimeType": "application/pdf",
    "sizeBytes": 1000,
    "rawResponse": { "text": "Test OCR content" }
  }'
# Expected: slug, request_id, id
```

### 3. View Database
```bash
bun run studio
# Navigate to http://localhost:3001
# Inspect tables: ocr_requests, exams, submissions, jobs
```

---

## Schema Overview

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `ocr_requests` | Store OCR results from frontend | `slug`, `raw_response`, `status` |
| `exams` | Group question paper + model answer | `slug`, `structure_output`, `status` |
| `submissions` | Group student submissions | `slug`, `exam_id`, `status` |
| `jobs` | Track async jobs (structure/grade) | `job_type`, `status`, `result` |
| `questions_paper` | Per-question data | `question_number`, `structure_question` |
| `question_solutions` | Model answers | `solution`, `metadata` |
| `graded_solutions` | Student grades | `marks`, `feedback` |

---

## Production Considerations

1. **Connection Pooling**: Use pgBouncer or Drizzle's connection pooling for production
2. **Backups**: Regular PostgreSQL backups recommended
3. **Indexes**: Consider adding indexes on `slug` columns for faster lookups
4. **Monitoring**: Set up alerts for job failures and slow queries
5. **Queue**: For high volume, replace DB-backed jobs with Redis + BullMQ

---

For issues or questions, check logs:
```bash
# Check server logs
tail -f logs/*.json

# Check database with Drizzle Studio
bun run studio
```
