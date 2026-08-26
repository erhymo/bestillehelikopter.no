import { verifyOfferToken } from "@/lib/tokens";
import { adminDb } from "@/lib/firebase/admin";
import { JobStatus } from "@/types";
import { RegisterForm } from "@/components/register/register-form";
import { TokenPageLayout } from "@/components/token-pages/token-page-layout";
import { trackServerPageView } from "@/lib/analytics-server";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function RegisterPage({ params }: PageProps) {
  const { token } = await params;

  // 1. Verify token
  const payload = verifyOfferToken(token);
  if (!payload) {
    return (
      <TokenPageLayout>
        <div className="rounded-lg bg-white p-8 text-center shadow-lg">
          <h1 className="mb-2 text-xl font-bold text-red-600">
            Ugyldig eller utløpt lenke
          </h1>
          <p className="text-gray-600">
            Denne lenken er ikke lenger gyldig. Kontakt oss hvis du mener dette
            er en feil.
          </p>
        </div>
      </TokenPageLayout>
    );
  }

  const { jobId, companyId } = payload;

  // 2. Fetch job
  const jobSnap = await adminDb.doc(`jobs/${jobId}`).get();
  if (!jobSnap.exists) {
    return (
      <TokenPageLayout>
        <div className="rounded-lg bg-white p-8 text-center shadow-lg">
          <h1 className="mb-2 text-xl font-bold text-red-600">
            Forespørselen ble ikke funnet
          </h1>
          <p className="text-gray-600">
            Denne forespørselen finnes ikke lenger i systemet.
          </p>
        </div>
      </TokenPageLayout>
    );
  }

  const jobData = jobSnap.data()!;

  trackServerPageView("company_register");

  // 3. Job must be accepted by this company before registering a date/time
  if (jobData.status !== JobStatus.Accepted || jobData.acceptedCompanyId !== companyId) {
    return (
      <TokenPageLayout>
        <div className="rounded-lg bg-white p-8 shadow-lg">
          <h1 className="mb-2 text-xl font-bold text-brand-700">
            Ikke klar for registrering
          </h1>
          <p className="text-gray-600">
            Kunden må akseptere tilbudet før dere kan registrere dato og
            tidspunkt for oppdraget.
          </p>
        </div>
      </TokenPageLayout>
    );
  }

  // 4. Show register form
  return (
    <TokenPageLayout>
      <div className="rounded-lg bg-white p-8 shadow-lg">
        <h1 className="mb-2 text-xl font-bold text-brand-700">
          Registrer dato og tidspunkt
        </h1>
        <p className="mb-6 text-sm text-gray-600">
          Skriv inn dato og klokkeslett dere ble enige med kunden om. Kunden
          får automatisk en bekreftelse på e-post.
        </p>
        <RegisterForm
          token={token}
          initialDate={jobData.confirmedDate ?? null}
          initialTime={jobData.confirmedTime ?? null}
          suggestedDate={jobData.desiredDate || null}
          suggestedTime={jobData.desiredTime || null}
          flexibleDate={!!jobData.flexibleDate}
        />
      </div>
    </TokenPageLayout>
  );
}
