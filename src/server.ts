import { env } from "@/config/env";
import app from "./index";

const server = app.listen(env.PORT, () => {
	console.log(`Server running on http://localhost:${env.PORT}`);
});

const shutdown = (message: string) => {
	console.log(message);
	server.close(() => {
		console.log("Process terminated");
	});
};

const handleFatalError = (label: string, err: unknown) => {
	console.error(`${label}:`, err);
	server.close(() => {
		process.exit(1);
	});
};

process.on("uncaughtException", (err) => {
	handleFatalError("UNCAUGHT EXCEPTION", err);
});

process.on("unhandledRejection", (err) => {
	handleFatalError("UNHANDLED REJECTION", err);
});

process.on("SIGTERM", () => shutdown("SIGTERM RECEIVED. Shutting down gracefully..."));
process.on("SIGINT", () => shutdown("SIGINT RECEIVED. Shutting down gracefully..."));
