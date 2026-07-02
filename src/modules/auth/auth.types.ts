/**
 * Shared auth/RBAC types for the module and the cross-cutting middleware.
 *
 * Kept dependency-free so both the module layers and `src/middleware/*` (and the
 * Express request augmentation in src/types) can import them without cycles.
 */

/** The minimal authenticated identity attached to `req.user` by `authenticate()`. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  preferredLanguage: 'en' | 'hi';
  isActive: boolean;
  /** The session id (`sid`) carried by the access token; ties back to the refresh session. */
  sessionId: string;
}

/** Resolved authorization context for a user: role keys + merged permission keys. */
export interface ResolvedAuthorization {
  roles: string[];
  /** Union of permission keys across every assigned role (canonical `module.action`). */
  permissions: string[];
  /** True when one of the roles is `super_admin`; treated as an allow-all wildcard. */
  isSuperAdmin: boolean;
}

/** Access-token JWT claims (lean — authorization is resolved live, not from the token). */
export interface AccessTokenClaims {
  sub: string;
  sid: string;
  type: 'access';
}

/** Refresh-token JWT claims; `jti` rotates on every refresh and is tracked in Redis. */
export interface RefreshTokenClaims {
  sub: string;
  sid: string;
  jti: string;
  type: 'refresh';
}

/** Result of issuing a token pair for a session. */
export interface IssuedTokens {
  userId: string;
  accessToken: string;
  /** Access-token lifetime in seconds (API spec login `expires_in`). */
  expiresIn: number;
  refreshToken: string;
  sessionId: string;
}
