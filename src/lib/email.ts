// Disposable-email check + validation utilities

const DISPOSABLE_DOMAINS_URL =
  "https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/master/disposable_email_blocklist.conf";

let _blocklist: Set<string> | null = null;

async function loadBlocklist(): Promise<Set<string>> {
  if (_blocklist) return _blocklist;
  try {
    const res = await fetch(DISPOSABLE_DOMAINS_URL);
    const text = await res.text();
    _blocklist = new Set(
      text
        .split("\n")
        .map((d) => d.trim().toLowerCase())
        .filter(Boolean)
    );
  } catch {
    _blocklist = new Set();
  }
  return _blocklist;
}

export async function isDisposableEmail(email: string): Promise<boolean> {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return true;
  const blocklist = await loadBlocklist();
  return blocklist.has(domain);
}

export function isValidNorwegianPhone(phone: string): boolean {
  return /^\+47[2-9]\d{7}$/.test(phone);
}

