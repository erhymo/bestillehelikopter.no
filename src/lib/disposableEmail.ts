/**
 * Disposable / temporary email blocking utility.
 *
 * Uses a local denylist of known disposable-email domains.
 * No external API calls — fast, deterministic, zero latency.
 *
 * To update: add domains to DISPOSABLE_DOMAINS below.
 */

// ── Denylist (lowercase, sorted) ────────────────────────────────────────────
// Seeded with the most common disposable-email providers.
// Sources: github.com/disposable-email-domains, ivolo/disposable-email-domains
const DISPOSABLE_DOMAINS: ReadonlySet<string> = new Set([
  "10minutemail.com",
  "20minutemail.com",
  "33mail.com",
  "binkmail.com",
  "boun.cr",
  "bugmenot.com",
  "burnermail.io",
  "clrmail.com",
  "cool.fr.nf",
  "correo.blogos.net",
  "cosmorph.com",
  "discard.email",
  "discardmail.com",
  "discardmail.de",
  "disposable.email",
  "disposableemailaddresses.emailmiser.com",
  "drdrb.net",
  "emailfake.com",
  "emailondeck.com",
  "emailsensei.com",
  "emailtemporario.com.br",
  "fakeinbox.com",
  "fakemail.fr",
  "filzmail.com",
  "getnada.com",
  "getonemail.com",
  "grr.la",
  "guerrillamail.com",
  "guerrillamail.de",
  "guerrillamail.info",
  "guerrillamail.net",
  "guerrillamailblock.com",
  "harakirimail.com",
  "hidemail.de",
  "inboxalias.com",
  "jetable.org",
  "jourrapide.com",
  "klzlk.com",
  "lhsdv.com",
  "mailcatch.com",
  "maildrop.cc",
  "mailexpire.com",
  "mailforspam.com",
  "mailin8r.com",
  "mailinator.com",
  "mailinator.net",
  "mailinator2.com",
  "mailmoat.com",
  "mailnesia.com",
  "mailnull.com",
  "mailsac.com",
  "mailscrap.com",
  "mailshell.com",
  "mailsiphon.com",
  "mailslurp.com",
  "mailtemp.info",
  "mailtothis.com",
  "mailzilla.com",
  "mintemail.com",
  "mohmal.com",
  "mt2015.com",
  "mytemp.email",
  "mytrashmail.com",
  "nobulk.com",
  "nospam.ze.tc",
  "notmailinator.com",
  "nowmymail.com",
  "sharklasers.com",
  "shieldedmail.com",
  "spamavert.com",
  "spambox.us",
  "spamcowboy.com",
  "spamfree24.org",
  "spamgourmet.com",
  "spamherelots.com",
  "spaml.de",
  "spammotel.com",
  "spamobox.com",
  "temp-mail.org",
  "temp-mail.ru",
  "tempail.com",
  "tempemail.co.za",
  "tempemail.net",
  "tempinbox.com",
  "tempmail.eu",
  "tempmailer.com",
  "tempmailo.com",
  "tempomail.fr",
  "temporaryemail.net",
  "temporaryforwarding.com",
  "temporaryinbox.com",
  "temporarymailaddress.com",
  "thankyou2010.com",
  "thisisnotmyrealemail.com",
  "throwaway.email",
  "throwawayemailaddress.com",
  "trashmail.at",
  "trashmail.com",
  "trashmail.io",
  "trashmail.me",
  "trashmail.net",
  "trashymail.com",
  "trashymail.net",
  "trbvm.com",
  "wegwerfmail.de",
  "wegwerfmail.net",
  "yopmail.com",
  "yopmail.fr",
  "yopmail.net",
]);

// ── Email format regex ──────────────────────────────────────────────────────
// Intentionally simple — covers 99.9% of real addresses.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Result of email validation.
 */
export interface EmailValidationResult {
  valid: boolean;
  reason?: "invalid_format" | "disposable_domain";
  /** Norwegian user-facing message */
  message?: string;
}

/**
 * Extract domain from an email address (lowercase).
 * Returns null if the email has no @ or domain part.
 */
export function extractDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 1) return null;
  const domain = email.slice(at + 1).toLowerCase().trim();
  return domain.length > 0 ? domain : null;
}

/**
 * Check if a domain is in the disposable denylist.
 */
export function isDisposableDomain(domain: string): boolean {
  return DISPOSABLE_DOMAINS.has(domain.toLowerCase().trim());
}

/**
 * Validate an email address: format + disposable check.
 */
export function validateEmail(email: string): EmailValidationResult {
  const trimmed = email.trim();

  if (!EMAIL_RE.test(trimmed)) {
    return {
      valid: false,
      reason: "invalid_format",
      message: "Ugyldig e-postadresse",
    };
  }

  const domain = extractDomain(trimmed);
  if (domain && isDisposableDomain(domain)) {
    return {
      valid: false,
      reason: "disposable_domain",
      message:
        "Midlertidige e-postadresser er ikke tillatt. Vennligst bruk en permanent e-postadresse.",
    };
  }

  return { valid: true };
}

