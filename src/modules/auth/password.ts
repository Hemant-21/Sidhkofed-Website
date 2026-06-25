/**
 * Password hashing helpers (bcrypt). Single place the hash algorithm/work factor lives,
 * so login verification (service) and the seeder use identical settings.
 */
import bcrypt from 'bcryptjs';
import { jwtConfig } from '@/config';

/** Hash a plaintext password using the configured work factor. */
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, jwtConfig.passwordHashRounds);
}

/** Constant-time compare of a plaintext password against a stored hash. */
export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
