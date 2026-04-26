import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import logger from "@/core/utils/logger";

type LogLlmResponseInput = {
	module: string;
	model: string;
	response: unknown;
	metadata?: Record<string, unknown>;
};

const LOGS_DIR = join(process.cwd(), "logs");

type LlmLogEntry = {
	timestamp: string;
	module: string;
	model: string;
	metadata?: Record<string, unknown>;
	response: unknown;
};

function getUniqueLogFilePath(date = new Date()) {
	const timestamp = date.toISOString().replace(/[:.]/g, "-");
	return join(LOGS_DIR, `llm-${timestamp}-${randomUUID()}.json`);
}

/**
 * Persists raw LLM outputs for debugging and audit trails.
 */
export async function logLlmResponse({ module, model, response, metadata }: LogLlmResponseInput) {
	try {
		await mkdir(LOGS_DIR, { recursive: true });
		const logFilePath = getUniqueLogFilePath();

		const payload: LlmLogEntry = {
			timestamp: new Date().toISOString(),
			module,
			model,
			metadata,
			response,
		};

		await writeFile(logFilePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
	} catch (error) {
		logger.warn({ error }, "Failed to persist LLM response log");
	}
}
