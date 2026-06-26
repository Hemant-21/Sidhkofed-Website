/**
 * Tiny event bus decoupling the API layer from the auth/UI layer. The client
 * emits `unauthorized` when a request fails terminally with 401 (refresh also
 * failed); the AuthProvider subscribes to clear the session and redirect to login.
 * Keeping this separate avoids a circular dependency between client ↔ provider.
 */

type AuthEvent = 'unauthorized' | 'forbidden';
type Handler = () => void;

const handlers: Record<AuthEvent, Set<Handler>> = {
  unauthorized: new Set(),
  forbidden: new Set(),
};

export const authEvents = {
  on(event: AuthEvent, handler: Handler): () => void {
    handlers[event].add(handler);
    return () => handlers[event].delete(handler);
  },
  emit(event: AuthEvent): void {
    handlers[event].forEach((h) => h());
  },
};
