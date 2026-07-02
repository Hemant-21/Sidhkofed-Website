/**
 * Auth response DTOs (API spec §2). snake_case fields, matching the published contract.
 * Mappers build these; controllers return them through the envelope. Never includes
 * `password_hash`, role junction rows, or token internals.
 */

/** The user object embedded in login/refresh responses and returned by `GET /auth/me`. */
export interface AuthUserDto {
  id: string;
  email: string;
  full_name: string;
  preferred_language: 'en' | 'hi';
  is_active: boolean;
  roles: string[];
  permissions: string[];
}

/** `POST /auth/login` and `POST /auth/refresh` success payload (`data`). */
export interface AuthSessionDto {
  access_token: string;
  expires_in: number;
  token_type: 'Bearer';
  user: AuthUserDto;
}
