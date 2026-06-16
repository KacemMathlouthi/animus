/** App-wide structured logger (pino) */

import pino from "pino";
import pretty from "pino-pretty";
import { env, isProduction } from "./env.ts";

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
