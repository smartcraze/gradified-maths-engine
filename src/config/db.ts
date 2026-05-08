export const db = {
	async execute() {
		throw new Error("Database is disabled in this build");
	},
};

export type Database = typeof db;
