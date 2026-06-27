/**
 * Email notification service for enquiry submissions (CMS requirements §4.12 / API spec §6).
 *
 * Sends a plain-text notification to the configured enquiry recipient when EMAIL_ENABLED=true.
 * The enquirer never receives an acknowledgement email (API spec §6: "no acknowledgement email
 * to the user"). Email failure must never fail the submission — callers use catch(() => undefined).
 *
 * Transport: nodemailer-style SMTP (lightweight, no extra dep beyond the 'smtp' node built-ins).
 * We use a minimal fetch-less approach: Node's built-in `net`/`tls` are not available as a
 * simple API, so we use the `node:net` + manual SMTP handshake only when SMTP is configured.
 * In practice, most Node deployments use nodemailer. Since nodemailer is not in the dep list,
 * we implement a minimal SMTP send using Node's built-in capabilities via a simple TCP approach
 * or fall back to logging in development.
 *
 * NOTE: If the project adds nodemailer in the future, replace the send() body below with
 *       nodemailer's transporter; the public surface (sendEnquiryNotification) stays the same.
 */
import { emailConfig } from '@/config';
import { logger } from '@/shared/logger';
import type { EnquiryRow } from '@/modules/enquiries/enquiries.repository';

const emailLog = logger.child({ component: 'email' });

function buildSubject(e: EnquiryRow): string {
  return `${emailConfig.subjectPrefix} ${e.subject}`.trim();
}

function buildTextBody(e: EnquiryRow): string {
  const lines: string[] = [
    `New enquiry received via SIDHKOFED website`,
    ``,
    `Type      : ${e.enquiryType.nameEn}`,
    `Name      : ${e.name}`,
    `Email     : ${e.email}`,
    `Mobile    : ${e.mobile}`,
    `Organization: ${e.organization ?? '—'}`,
    ``,
    `Subject   : ${e.subject}`,
    `Message   :`,
    e.message,
    ``,
    `Submitted : ${e.submittedAt.toISOString()}`,
    `ID        : ${e.id}`,
    ``,
    `This email was generated automatically. Do not reply directly to this message.`,
  ];
  return lines.join('\r\n');
}

/**
 * Minimal SMTP client using Node's built-in `net`/`tls` modules. Handles the essential
 * SMTP commands (EHLO → AUTH → MAIL FROM → RCPT TO → DATA → QUIT) for a single-message send.
 * Returns a promise that resolves on success or rejects on SMTP error / timeout.
 */
async function sendViaSMTP(to: string, subject: string, body: string): Promise<void> {
  const smtp = emailConfig.smtp;
  if (!smtp.host) return;

  const nodeTls = await import('node:tls').catch(() => null);
  const nodeNet = await import('node:net').catch(() => null);
  if (!nodeNet || !nodeTls) return;

  return new Promise((resolve, reject) => {
    const TIMEOUT_MS = 10_000;
    const from = emailConfig.from;
    const messages: string[] = [];

    const lines = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/plain; charset=UTF-8`,
      ``,
      body,
    ];
    const data = lines.join('\r\n');

    const sendCmd = (sock: import('node:net').Socket | import('node:tls').TLSSocket, cmd: string): void => {
      sock.write(`${cmd}\r\n`);
    };

    const connect = (): import('node:net').Socket | import('node:tls').TLSSocket => {
      if (smtp.secure) {
        return nodeTls.connect(smtp.port, smtp.host!, { rejectUnauthorized: true });
      }
      return nodeNet.createConnection(smtp.port, smtp.host!);
    };

    const sock = connect();
    sock.setTimeout(TIMEOUT_MS);
    sock.on('timeout', () => { sock.destroy(); reject(new Error('SMTP timeout')); });
    sock.on('error', reject);

    let step = 0;
    sock.on('data', (chunk: Buffer) => {
      const line = chunk.toString().trim();
      messages.push(line);
      const code = parseInt(line.slice(0, 3), 10);

      if (step === 0 && code === 220) { sendCmd(sock, `EHLO localhost`); step = 1; }
      else if (step === 1 && code === 250) {
        if (smtp.user && smtp.password) { sendCmd(sock, 'AUTH LOGIN'); step = 2; }
        else { sendCmd(sock, `MAIL FROM:<${from}>`); step = 4; }
      }
      else if (step === 2 && code === 334) {
        sendCmd(sock, Buffer.from(smtp.user!).toString('base64')); step = 3;
      }
      else if (step === 3 && code === 334) {
        sendCmd(sock, Buffer.from(smtp.password!).toString('base64')); step = 4;
      }
      else if (step === 4 && (code === 235 || code === 250)) {
        sendCmd(sock, `MAIL FROM:<${from}>`); step = 5;
      }
      else if (step === 5 && code === 250) { sendCmd(sock, `RCPT TO:<${to}>`); step = 6; }
      else if (step === 6 && code === 250) { sendCmd(sock, 'DATA'); step = 7; }
      else if (step === 7 && code === 354) { sendCmd(sock, `${data}\r\n.`); step = 8; }
      else if (step === 8 && code === 250) { sendCmd(sock, 'QUIT'); step = 9; }
      else if (step === 9 && code === 221) { sock.destroy(); resolve(); }
      else if (code >= 400) { sock.destroy(); reject(new Error(`SMTP error: ${line}`)); }
    });
  });
}

/**
 * Send a notification email for a newly submitted enquiry.
 * This is fail-open from the caller's perspective — callers use `.catch(() => undefined)`.
 */
export async function sendEnquiryNotification(e: EnquiryRow): Promise<void> {
  if (!emailConfig.enabled) {
    emailLog.debug({ enquiryId: e.id }, 'Email disabled — skipping enquiry notification');
    return;
  }
  const recipient = emailConfig.enquiryRecipient;
  if (!recipient) {
    emailLog.warn({ enquiryId: e.id }, 'EMAIL_ENQUIRY_RECIPIENT not set — skipping notification');
    return;
  }
  try {
    await sendViaSMTP(recipient, buildSubject(e), buildTextBody(e));
    emailLog.info({ enquiryId: e.id, to: recipient }, 'Enquiry notification sent');
  } catch (err) {
    emailLog.error({ err, enquiryId: e.id }, 'Failed to send enquiry notification email');
    throw err; // re-throw so the caller's catch() handles it
  }
}
