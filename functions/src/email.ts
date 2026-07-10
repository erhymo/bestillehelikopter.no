/**
 * SendGrid email module for BestilleHelikopter.no
 *
 * - Raw HTML builder with tracking-friendly links
 * - SendGrid custom_args for webhook event correlation
 * - Enables open + click tracking via SendGrid tracking settings
 */

import { defineString } from "firebase-functions/params";
import sgMail from "@sendgrid/mail";

// ── Params ────────────────────────────────────────────────────

const sendgridApiKey = defineString("SENDGRID_API_KEY");
const sendgridFromEmail = defineString("SENDGRID_FROM_EMAIL", {
  default: "post@bestillehelikopter.no",
});

// ── Types ─────────────────────────────────────────────────────

export interface RfqEmailData {
  jobId: string;
  companyName: string;
  companyEmail: string;
  companyId: string;
  offerId: string;
  offerUrl: string;
  dropCount: number;
  totalFlightTimeMin: number;
  desiredDate: string;
  flexibleDate: boolean;
  nettbruk: boolean;
  over15m: boolean;
  pdfBase64: string | null; // null = no attachment
}

export interface EmailResult {
  offerId: string;
  success: boolean;
  error?: string;
}

export interface AcceptConfirmationEmailData {
  jobId: string;
  customerEmail: string;
  customerName: string;
  companyName: string;
  price: number;
  offerId: string;
  companyId: string;
}

export interface OfferAcceptedEmailData {
  jobId: string;
  companyEmail: string;
  companyName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  price: number;
  offerId: string;
  companyId: string;
}

export interface JobClosedEmailData {
  jobId: string;
  companyEmail: string;
  companyName: string;
  offerId: string;
  companyId: string;
}

// ── HTML builder ──────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildRfqEmailHtml(data: RfqEmailData): string {
  const dateStr = data.desiredDate
    ? escapeHtml(data.desiredDate) +
      (data.flexibleDate ? " (fleksibel)" : "")
    : "Ikke spesifisert";

  const extras: string[] = [];
  if (data.nettbruk) extras.push("Nettbruk");
  if (data.over15m) extras.push("Last over 15m");

  return `<!DOCTYPE html>
<html lang="no">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,Helvetica,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px;background:#f9f9f9">
  <div style="background:#fff;border-radius:8px;padding:32px;border:1px solid #e5e5e5">
    <h2 style="color:#1e3a5f;margin-top:0">Ny helikopterforespørsel</h2>
    <p>Hei ${escapeHtml(data.companyName)},</p>
    <p>En kunde har sendt en forespørsel om helikoptertransport via BestilleHelikopter.no.</p>

    <table style="border-collapse:collapse;width:100%;margin:16px 0">
      <tr style="border-bottom:1px solid #eee"><td style="padding:8px 12px;color:#666">Ønsket dato</td><td style="padding:8px 12px;font-weight:600">${dateStr}</td></tr>
      <tr style="border-bottom:1px solid #eee"><td style="padding:8px 12px;color:#666">Antall dropp</td><td style="padding:8px 12px;font-weight:600">${data.dropCount}</td></tr>
      <tr style="border-bottom:1px solid #eee"><td style="padding:8px 12px;color:#666">Est. flytid</td><td style="padding:8px 12px;font-weight:600">${data.totalFlightTimeMin.toFixed(1)} min</td></tr>
      ${extras.length > 0 ? `<tr style="border-bottom:1px solid #eee"><td style="padding:8px 12px;color:#666">Tillegg</td><td style="padding:8px 12px;font-weight:600">${escapeHtml(extras.join(", "))}</td></tr>` : ""}
    </table>

    <p>PDF med fullstendig informasjon er vedlagt.</p>

    <div style="margin:24px 0;text-align:center">
      <a href="${escapeHtml(data.offerUrl)}"
         style="display:inline-block;padding:14px 28px;background:#1e3a5f;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:16px">
        Se detaljer og gi tilbud
      </a>
    </div>

    <p style="font-size:13px;color:#888;margin-bottom:0">
      Denne lenken er gyldig i 14 dager. Ikke del den med andre.<br>
      Du mottar denne e-posten fordi du er registrert som helikopterselskap på BestilleHelikopter.no.
    </p>
  </div>
</body>
</html>`;
}

// ── Subject builder ───────────────────────────────────────────

export function buildRfqSubject(data: RfqEmailData): string {
  const parts = [`Ny helikopterforespørsel — ${data.dropCount} dropp`];
  if (data.desiredDate) parts.push(data.desiredDate);
  return parts.join(", ");
}

// ── Send function ─────────────────────────────────────────────

/**
 * Send a single RFQ email via SendGrid.
 *
 * Uses custom_args for webhook event correlation:
 *   - jobId, companyId, offerId are sent as custom args
 *   - SendGrid returns these in webhook events for correlation
 *
 * Tracking settings:
 *   - click_tracking: enabled (tracks "Se detaljer og gi tilbud" clicks)
 *   - open_tracking: enabled (invisible pixel)
 */
export async function sendRfqEmail(data: RfqEmailData): Promise<EmailResult> {
  sgMail.setApiKey(sendgridApiKey.value());

  const html = buildRfqEmailHtml(data);
  const subject = buildRfqSubject(data);

  const msg: sgMail.MailDataRequired = {
    to: data.companyEmail,
    from: {
      email: sendgridFromEmail.value(),
      name: "BestilleHelikopter.no",
    },
    subject,
    html,
    // Custom args — returned in SendGrid webhook events for correlation
    customArgs: {
      jobId: data.jobId,
      companyId: data.companyId,
      offerId: data.offerId,
    },
    // Tracking settings — enable open + click tracking per message
    trackingSettings: {
      clickTracking: { enable: true, enableText: false },
      openTracking: { enable: true },
    },
    // Attachment
    ...(data.pdfBase64
      ? {
          attachments: [
            {
              content: data.pdfBase64,
              filename: `helikopter-forespørsel-${data.jobId}.pdf`,
              type: "application/pdf",
              disposition: "attachment" as const,
            },
          ],
        }
      : {}),
  };

  try {
    await sgMail.send(msg);
    return { offerId: data.offerId, success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[email] Failed to send to ${data.companyEmail}: ${message}`,
    );
    return { offerId: data.offerId, success: false, error: message };
  }
}


// ── Accept confirmation email (to customer) ─────────────────

export async function sendAcceptConfirmationEmail(
  data: AcceptConfirmationEmailData,
): Promise<EmailResult> {
  sgMail.setApiKey(sendgridApiKey.value());

  const html = `<!DOCTYPE html>
<html lang="no">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,Helvetica,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px;background:#f9f9f9">
  <div style="background:#fff;border-radius:8px;padding:32px;border:1px solid #e5e5e5">
    <h2 style="color:#1e3a5f;margin-top:0">Tilbud akseptert ✅</h2>
    <p>Hei ${escapeHtml(data.customerName)},</p>
    <p>Du har akseptert tilbudet fra <strong>${escapeHtml(data.companyName)}</strong>.</p>
    <table style="border-collapse:collapse;width:100%;margin:16px 0">
      <tr style="border-bottom:1px solid #eee"><td style="padding:8px 12px;color:#666">Selskap</td><td style="padding:8px 12px;font-weight:600">${escapeHtml(data.companyName)}</td></tr>
      <tr style="border-bottom:1px solid #eee"><td style="padding:8px 12px;color:#666">Pris</td><td style="padding:8px 12px;font-weight:600">${data.price.toLocaleString("nb-NO")} NOK</td></tr>
    </table>
    <p>Selskapet har fått beskjed og vil kontakte deg direkte for å avtale videre detaljer.</p>
    <p style="font-size:13px;color:#888;margin-bottom:0">
      Denne e-posten er sendt fra BestilleHelikopter.no.
    </p>
  </div>
</body>
</html>`;

  try {
    await sgMail.send({
      to: data.customerEmail,
      from: { email: sendgridFromEmail.value(), name: "BestilleHelikopter.no" },
      subject: `Tilbud akseptert — ${escapeHtml(data.companyName)}`,
      html,
      customArgs: {
        jobId: data.jobId,
        companyId: data.companyId,
        offerId: data.offerId,
      },
    });
    return { offerId: data.offerId, success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[email] Failed to send accept confirmation to ${data.customerEmail}: ${message}`);
    return { offerId: data.offerId, success: false, error: message };
  }
}

// ── Offer accepted email (to winning company) ───────────────

export async function sendOfferAcceptedEmail(
  data: OfferAcceptedEmailData,
): Promise<EmailResult> {
  sgMail.setApiKey(sendgridApiKey.value());

  const html = `<!DOCTYPE html>
<html lang="no">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,Helvetica,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px;background:#f9f9f9">
  <div style="background:#fff;border-radius:8px;padding:32px;border:1px solid #e5e5e5">
    <h2 style="color:#1e3a5f;margin-top:0">Ditt tilbud er akseptert! 🎉</h2>
    <p>Hei ${escapeHtml(data.companyName)},</p>
    <p>Kunden har akseptert tilbudet ditt på <strong>${data.price.toLocaleString("nb-NO")} NOK</strong>.</p>
    <h3 style="color:#1e3a5f;margin-top:24px">Kundeinformasjon</h3>
    <table style="border-collapse:collapse;width:100%;margin:8px 0">
      <tr style="border-bottom:1px solid #eee"><td style="padding:8px 12px;color:#666">Navn</td><td style="padding:8px 12px;font-weight:600">${escapeHtml(data.customerName)}</td></tr>
      <tr style="border-bottom:1px solid #eee"><td style="padding:8px 12px;color:#666">E-post</td><td style="padding:8px 12px;font-weight:600">${escapeHtml(data.customerEmail)}</td></tr>
      <tr style="border-bottom:1px solid #eee"><td style="padding:8px 12px;color:#666">Telefon</td><td style="padding:8px 12px;font-weight:600">${escapeHtml(data.customerPhone)}</td></tr>
    </table>
    <p>Ta kontakt med kunden for å avtale videre detaljer.</p>
    <p style="font-size:13px;color:#888;margin-bottom:0">
      Denne e-posten er sendt fra BestilleHelikopter.no.
    </p>
  </div>
</body>
</html>`;

  try {
    await sgMail.send({
      to: data.companyEmail,
      from: { email: sendgridFromEmail.value(), name: "BestilleHelikopter.no" },
      subject: `Tilbudet ditt er akseptert! — ${data.price.toLocaleString("nb-NO")} NOK`,
      html,
      customArgs: {
        jobId: data.jobId,
        companyId: data.companyId,
        offerId: data.offerId,
      },
    });
    return { offerId: data.offerId, success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[email] Failed to send offer-accepted to ${data.companyEmail}: ${message}`);
    return { offerId: data.offerId, success: false, error: message };
  }
}

// ── Job closed email (to other companies) ───────────────────

export async function sendJobClosedEmail(
  data: JobClosedEmailData,
): Promise<EmailResult> {
  sgMail.setApiKey(sendgridApiKey.value());

  const html = `<!DOCTYPE html>
<html lang="no">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,Helvetica,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px;background:#f9f9f9">
  <div style="background:#fff;border-radius:8px;padding:32px;border:1px solid #e5e5e5">
    <h2 style="color:#1e3a5f;margin-top:0">Forespørsel avsluttet</h2>
    <p>Hei ${escapeHtml(data.companyName)},</p>
    <p>Kunden har valgt et annet selskap for denne forespørselen. Vi takker for at du deltok.</p>
    <p>Vi håper du vil fortsette å motta forespørsler via BestilleHelikopter.no.</p>
    <p style="font-size:13px;color:#888;margin-bottom:0">
      Denne e-posten er sendt fra BestilleHelikopter.no.
    </p>
  </div>
</body>
</html>`;

  try {
    await sgMail.send({
      to: data.companyEmail,
      from: { email: sendgridFromEmail.value(), name: "BestilleHelikopter.no" },
      subject: "Forespørsel avsluttet",
      html,
      customArgs: {
        jobId: data.jobId,
        companyId: data.companyId,
        offerId: data.offerId,
      },
    });
    return { offerId: data.offerId, success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[email] Failed to send job-closed to ${data.companyEmail}: ${message}`);
    return { offerId: data.offerId, success: false, error: message };
  }
}
