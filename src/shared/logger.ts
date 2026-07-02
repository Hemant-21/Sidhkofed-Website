/**
 * Structured application logger (Pino).
 *
 * The single logging surface for the whole backend — no `console.log` in request
 * paths (docs/foundation/04-coding-standards.md §8). In development it pretty-prints
 * via `pino-pretty`; in production it emits newline-delimited JSON for log shippers.
 * Request-scoped logging (with request ids) is wired in middleware/request-logger.ts.
 */
import pino, { type LoggerOptions } from 'pino';
import { appConfig, isProduction } from '@/config';

const options: LoggerOptions = {
  level: appConfig.logLevel,
  base: { service: appConfig.name, env: appConfig.env },
  // Never let secrets / auth material reach the logs.
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      '*.password',
      '*.password_hash',
      '*.token',
      '*.access_token',
      '*.refresh_token',
    ],
    censor: '[redacted]',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
};

if (!isProduction) {
  try {
    require.resolve('pino-pretty');
    options.transport = {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:HH:MM:ss.l', ignore: 'pid,hostname,service,env' },
    };
  } catch {
    // pino-pretty not installed (e.g. production image built with --omit=dev); fall back to JSON output
  }
}

export const logger = pino(options);

export type Logger = typeof logger;
