import pino from "pino";
import { config } from "../config.js";

export const logger = pino({
  level: config.isProd ? "info" : "debug",
  transport: config.isProd ? undefined : { target: "pino-pretty", options: { colorize: true } },
  serializers: {
    err: pino.stdSerializers.err,
    req: (req: { method?: string; url?: string; id?: string }) => ({
      method: req.method,
      url: req.url,
      id: req.id,
    }),
  },
  redact: ["req.headers.cookie", "req.headers.authorization"],
});
