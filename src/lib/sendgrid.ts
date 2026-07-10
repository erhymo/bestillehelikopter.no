import "server-only";

// SendGrid e-post hjelpere (server-only)
// TODO: implementer med @sendgrid/mail

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    content: string; // base64
    filename: string;
    type: string;
  }>;
}

export async function sendEmail(_options: EmailOptions): Promise<void> {
  // TODO: implementer
  throw new Error("Not implemented");
}

