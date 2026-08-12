import { CheckCircle2, Info } from "lucide-react";
import { verifyOfferToken } from "@/lib/tokens";
import { adminDb } from "@/lib/firebase/admin";
import { OfferStatus, JobStatus, type OfferAddon } from "@/types";
import { OFFER_PRICE_DISCLAIMER } from "@/lib/offerAddons";
import { AcceptButton } from "@/components/accept/accept-button";
import { TokenPageLayout } from "@/components/token-pages/token-page-layout";
import { trackServerPageView, trackServerFunnel } from "@/lib/analytics-server";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function CustomerAcceptPage({ params }: PageProps) {
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

  const { jobId, companyId, offerId } = payload;

  // 2. Fetch job + offer + company
  const [jobSnap, offerSnap, companySnap] = await Promise.all([
    adminDb.doc(`jobs/${jobId}`).get(),
    adminDb.doc(`jobs/${jobId}/offers/${offerId}`).get(),
    adminDb.doc(`companies/${companyId}`).get(),
  ]);

  if (!jobSnap.exists || !offerSnap.exists) {
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
  const offerData = offerSnap.data()!;
  const companyName = companySnap.data()?.name ?? "Ukjent selskap";

  // 3. Log accept_view event (fire-and-forget)
  trackServerPageView("customer_accept");
  trackServerFunnel("accept_viewed");
  adminDb
    .collection("events")
    .add({
      type: "accept_view",
      jobId,
      companyId,
      offerId,
      createdAt: new Date().toISOString(),
    })
    .catch((err: unknown) =>
      console.error("[accept-page] Failed to log accept_view event:", err),
    );

  // 4. If job is already accepted
  if (jobData.status === JobStatus.Accepted) {
    const isThisOffer = jobData.acceptedCompanyId === companyId;
    return (
      <TokenPageLayout>
        <div className="rounded-lg bg-white p-8 shadow-lg">
          <div className="mb-3 flex justify-center">
            {isThisOffer ? (
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            ) : (
              <Info className="h-10 w-10 text-blue-500" />
            )}
          </div>
          <h1 className="mb-2 text-center text-xl font-bold text-brand-700">
            {isThisOffer
              ? "Tilbudet er allerede akseptert"
              : "Et annet tilbud er akseptert"}
          </h1>
          <p className="text-center text-gray-600">
            {isThisOffer
              ? `Du har allerede akseptert tilbudet fra ${companyName}. Selskapet vil kontakte deg.`
              : "Denne forespørselen er allerede tildelt et annet selskap."}
          </p>
        </div>
      </TokenPageLayout>
    );
  }

  // 5. If offer is not in "replied" status — cannot accept
  if (offerData.status !== OfferStatus.Replied) {
    return (
      <TokenPageLayout>
        <div className="rounded-lg bg-white p-8 shadow-lg">
          <h1 className="mb-2 text-xl font-bold text-brand-700">
            Tilbudet er ikke klart
          </h1>
          <p className="text-gray-600">
            Dette tilbudet har ikke blitt sendt inn av selskapet ennå, eller er
            ikke lenger tilgjengelig.
          </p>
        </div>
      </TokenPageLayout>
    );
  }

  // 6. Show offer details + accept button
  const addons: OfferAddon[] = Array.isArray(offerData.addons) ? offerData.addons : [];
  const grandTotal = offerData.totalPrice ?? offerData.price ?? 0;
  return (
    <TokenPageLayout>
      <div className="rounded-lg bg-white p-8 shadow-lg">
        <h1 className="mb-2 text-xl font-bold text-brand-700">
          Aksepter tilbud
        </h1>
        <p className="mb-6 text-sm text-gray-600">
          Gjennomgå tilbudet og aksepter for å tildele oppdraget.
        </p>

        {/* Offer details */}
        <div className="mb-6 space-y-3 rounded-lg bg-gray-50 p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Selskap</span>
            <span className="font-semibold">{companyName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">
              Flytidskostnad
              {offerData.hourlyRate ? ` (${offerData.hourlyRate.toLocaleString("nb-NO")} NOK/t)` : ""}
            </span>
            <span className="font-medium">
              {offerData.price?.toLocaleString("nb-NO")} NOK
            </span>
          </div>
          {addons.map((a) => (
            <div key={a.key} className="flex justify-between text-gray-600">
              <span>{a.label}</span>
              <span>{a.price.toLocaleString("nb-NO")} NOK</span>
            </div>
          ))}
          <div className="flex justify-between border-t pt-2">
            <span className="font-semibold text-gray-900">Totalpris</span>
            <span className="text-lg font-bold text-brand-700">
              {grandTotal.toLocaleString("nb-NO")} NOK
            </span>
          </div>
        </div>

        <p className="mb-4 text-xs text-gray-500">{OFFER_PRICE_DISCLAIMER}</p>

        <AcceptButton token={token} />
      </div>
    </TokenPageLayout>
  );
}
