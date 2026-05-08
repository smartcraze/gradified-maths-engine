FROM oven/bun:latest AS builder

WORKDIR /app

COPY package.json bun.lock ./
COPY public ./public

RUN bun install

COPY . .

RUN bun run build

EXPOSE 4173

CMD ["bun", "run", "preview", "--host", "0.0.0.0"]