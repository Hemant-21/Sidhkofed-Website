/**
 * Per-request audit context builder: authenticated user id, privacy-safe hashed client
 * IP (never the raw IP — CMS requirements §4.12 / schema `ip_hash`), and user agent.
 * Used by admin controllers when recording audit events.
 */
import { createHash } from 'node:crypto';
import type { Request } from 'express';
import { abuseConfig } from '@/config';
import type { AuditContext } from '@/modules/audit/audit.service';

export function auditContext(req: Request): AuditContext {
  const ip = req.ip ?? 'unknown';
  return {
    userId: req.user?.id ?? null,
    ipHash: createHash('sha256').update(`${ip}:${abuseConfig.ipHashSalt}`).digest('hex'),
    userAgent: req.headers['user-agent'] ?? null,
  };
}
