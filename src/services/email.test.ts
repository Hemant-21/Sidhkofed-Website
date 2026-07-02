/**
 * Unit tests — email notification service.
 * Tests the enabled/disabled paths and missing-recipient guard without
 * opening a real TCP connection (SMTP logic is guarded by config flags).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { emailCfg } = vi.hoisted(() => ({
  emailCfg: {
    enabled: false,
    from: 'cms@sidhkofed.example',
    enquiryRecipient: '',
    subjectPrefix: '[SIDHKOFED Enquiry]',
    smtp: { host: '', port: 587, secure: false, user: undefined as string | undefined, password: undefined as string | undefined },
  },
}));

vi.mock('@/config', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    emailConfig: emailCfg,
  };
});
vi.mock('@/shared/logger', () => ({ logger: { child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }) } }));

import { sendEnquiryNotification } from './email';
import type { EnquiryRow } from '@/modules/enquiries/enquiries.repository';

const SUBMITTED = new Date('2026-06-27T10:00:00Z');

function makeRow(over: Partial<EnquiryRow> = {}): EnquiryRow {
  return {
    id: 'uuid-1',
    name: 'Ramesh Kumar',
    email: 'ramesh@example.com',
    mobile: '+91 94300 12345',
    subject: 'Training Query',
    message: 'Please share schedule.',
    organization: null,
    submittedAt: SUBMITTED,
    enquiryType: { id: 'et1', slug: 'general', nameEn: 'General', nameHi: null },
    commodity: null,
    programmeScheme: null,
    spamState: 'clean',
    archivedAt: null,
    internalNotes: null,
    sourceIpHash: null,
    commodityId: null,
    programmeSchemeId: null,
    enquiryTypeId: 'et1',
    createdAt: SUBMITTED,
    updatedAt: SUBMITTED,
    ...over,
  } as EnquiryRow;
}

beforeEach(() => {
  emailCfg.enabled = false;
  emailCfg.enquiryRecipient = '';
  emailCfg.smtp.host = '';
  vi.clearAllMocks();
});

describe('sendEnquiryNotification', () => {
  it('is a no-op when EMAIL_ENABLED=false', async () => {
    emailCfg.enabled = false;
    emailCfg.enquiryRecipient = 'admin@example.com';
    await expect(sendEnquiryNotification(makeRow())).resolves.toBeUndefined();
  });

  it('is a no-op when EMAIL_ENQUIRY_RECIPIENT is empty', async () => {
    emailCfg.enabled = true;
    emailCfg.enquiryRecipient = '';
    await expect(sendEnquiryNotification(makeRow())).resolves.toBeUndefined();
  });

  it('is a no-op when EMAIL_ENABLED=true but smtp.host is absent (sendViaSMTP early return)', async () => {
    emailCfg.enabled = true;
    emailCfg.enquiryRecipient = 'admin@example.com';
    emailCfg.smtp.host = '';
    // sendViaSMTP returns immediately when host is falsy — no network call.
    await expect(sendEnquiryNotification(makeRow())).resolves.toBeUndefined();
  });

  it('re-throws SMTP errors so callers can swallow them (fail-open at call-site via .catch)', async () => {
    emailCfg.enabled = true;
    emailCfg.enquiryRecipient = 'admin@example.com';
    emailCfg.smtp.host = 'smtp.example.com';
    emailCfg.smtp.port = 587;
    // Node's `net` module will reject when no real SMTP server is running.
    // The service should re-throw so the enquiry service's `.catch(() => undefined)` swallows it.
    await expect(sendEnquiryNotification(makeRow())).rejects.toThrow();
  });
});
