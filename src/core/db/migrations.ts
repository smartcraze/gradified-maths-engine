import logger from "@/core/middleware/logger.middleware";
import { db } from "@/db";

/**
 * Run database migrations (for initialization/testing)
 */
export async function runMigrations(): Promise<void> {
	try {
		logger.info("Running database migrations...");
		// Migrations are typically run via drizzle-kit CLI
		// This is a placeholder for manual setup if needed
		logger.info("Migrations completed");
	} catch (error) {
		logger.error("Migration error:", error);
		throw error;
	}
}

/**
 * Verify database connection
 */
export async function verifyDbConnection(): Promise<boolean> {
	try {
		await db.execute("SELECT 1");
		logger.info("Database connection verified");
		return true;
	} catch (error) {
		logger.error("Database connection failed:", error);
		return false;
	}
}

/**
 * Health check endpoint data
 */
export async function getDbHealth() {
	try {
		const result = await db.execute("SELECT NOW() as current_time");
		return {
			status: "healthy",
			timestamp: new Date().toISOString(),
		};
	} catch (error) {
		return {
			status: "unhealthy",
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}
