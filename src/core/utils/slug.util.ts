import crypto from "node:crypto";

/**
 * Generate a URL-friendly slug from a string
 */
export function generateSlug(prefix: string): string {
	const timestamp = Date.now();
	const random = Math.random().toString(36).substring(2, 8);
	return `${prefix}-${timestamp}-${random}`.toLowerCase();
}

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
	return `req-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Compute SHA256 hash of a string
 */
export function hashString(str: string): string {
	return crypto.createHash("sha256").update(str).digest("hex");
}

/**
 * Validate if OCR response JSON is valid
 */
export function validateOcrResponse(data: unknown): boolean {
	if (!data || typeof data !== "object") return false;
	// Basic validation: check if it has expected OCR-like structure
	const obj = data as Record<string, unknown>;
	return typeof obj === "object" && (obj.text !== undefined || obj.data !== undefined || obj.pages !== undefined);
}
