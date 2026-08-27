import { getServerEnv } from "@animus/core/env";
import pino from "pino";
import pretty from "pino-pretty";

const env = getServerEnv();
const isProduction = env.nodeEnv === "production";

const level = env.logLevel ?? (isProduction ? "info" : "debug");

export const logger = isProduction
  ? pino({ level })
  : pino(
      { level },
      pretty({
        colorize: true,
        translateTime: "SYS:HH:MM:ss.l",
        ignore: "pid,hostname",
      })
    );
