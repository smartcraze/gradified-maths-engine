import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Client } = pg;

if (!process.env.DATABASE_URL) {
	throw new Error("DATABASE_URL environment variable is not set");
}

const client = new Client({
	connectionString: process.env.DATABASE_URL,
});

await client.connect();

export const db = drizzle(client, { schema });

export type Database = typeof db;
