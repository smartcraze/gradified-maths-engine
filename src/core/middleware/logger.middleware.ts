import pinoHttp from "pino-http";
import logger from "../utils/logger";

const httpLogger = pinoHttp({
  logger,
  customLogLevel: (_req, res, err) => {
    if (res.statusCode >= 500 || err) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  customSuccessMessage: (req, res) => `${req.method} ${req.url} -> ${res.statusCode}`,
  customErrorMessage: (req, res, err) => `${req.method} ${req.url} -> ${res.statusCode} ${err.message}`,
  serializers: {
    req: () => undefined,
    res: () => undefined,
    err: (err) => ({
      type: err.type,
      message: err.message,
    }),
  },
});

export default httpLogger;
