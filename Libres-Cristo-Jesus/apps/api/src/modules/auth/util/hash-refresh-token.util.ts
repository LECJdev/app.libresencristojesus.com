import { createHash } from 'node:crypto';

/**
 * Hashes a refresh token for storage in `UserSession.refreshToken`
 * (`Documentos/21`, section 4: "El Refresh Token se almacenará hasheado.
 * Nunca en texto plano."). Deliberately SHA-256, NOT Argon2id: Argon2id
 * is designed to be slow, for low-entropy secrets like passwords — a
 * refresh token is already a high-entropy random JWT, so a fast,
 * equality-searchable hash is the correct tool here (it needs to be
 * looked up directly by value on every refresh/logout call, which a
 * deliberately-slow KDF would make expensive for no security benefit).
 */
export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
