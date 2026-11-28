import * as Sentry from '@sentry/node';
import { config } from './config.js';

const enabled = Boolean(config.SENTRY_DSN);
if (enabled) {
  Sentry.init({
    dsn: config.SENTRY_DSN,
    sendDefaultPii: false,
    beforeSend(event) {
      delete event.user;
      delete event.extra;
      return event;
    },
  });
}

/** Report a crash with only the command name; no user ids, names or message text */
export function captureError(err: unknown, command?: string) {
  if (enabled) Sentry.captureException(err, { tags: command ? { command } : {} });
}
