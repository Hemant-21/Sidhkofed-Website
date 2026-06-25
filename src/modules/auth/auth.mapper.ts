/**
 * Auth mappers — entity/resolved data → response DTOs (envelope-ready). Controllers
 * return only DTOs; no entity ever crosses the HTTP boundary.
 */
import type { AuthUserDto } from './auth.dto';
import type { ResolvedAuthorization } from './auth.types';

interface UserCore {
  id: string;
  email: string;
  fullName: string;
  preferredLanguage: 'en' | 'hi';
  isActive: boolean;
}

/** Build the public user object (login/refresh/me) from core fields + resolved authz. */
export function toAuthUserDto(user: UserCore, auth: ResolvedAuthorization): AuthUserDto {
  return {
    id: user.id,
    email: user.email,
    full_name: user.fullName,
    preferred_language: user.preferredLanguage,
    is_active: user.isActive,
    roles: auth.roles,
    permissions: auth.permissions,
  };
}
