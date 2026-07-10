import { verifyOfferToken, buildRatingUrl } from "@/lib/tokens";
import { adminDb } from "@/lib/firebase/admin";
import { OfferStatus, JobStatus } from "@/types";
import { AcceptButton } from "@/components/accept/accept-button";
import Link from "next/link";
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
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="rounded-lg bg-white p-8 text-center shadow-lg">
          <h1 className="mb-2 text-xl font-bold text-red-600">
            Ugyldig eller utløpt lenke
          </h1>
          <p className="text-gray-600">
            Denne lenken er ikke lenger gyldig. Kontakt oss hvis du mener dette
            er en feil.
          </p>
        </div>
      </div>
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
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="rounded-lg bg-white p-8 text-center shadow-lg">
          <h1 className="mb-2 text-xl font-bold text-red-600">
            Forespørselen ble ikke funnet
          </h1>
          <p className="text-gray-600">
            Denne forespørselen finnes ikke lenger i systemet.
          </p>
        </div>
      </div>
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
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-lg rounded-lg bg-white p-8 shadow-lg">
          <div className="mb-3 text-center text-4xl">
            {isThisOffer ? "✅" : "ℹ️"}
          </div>
          <h1 className="mb-2 text-center text-xl font-bold text-[#1e3a5f]">
            {isThisOffer
              ? "Tilbudet er allerede akseptert"
              : "Et annet tilbud er akseptert"}
          </h1>
          <p className="text-center text-gray-600">
            {isThisOffer
              ? `Du har allerede akseptert tilbudet fra ${companyName}. Selskapet vil kontakte deg.`
              : "Denne forespørselen er allerede tildelt et annet selskap."}
          </p>
          {isThisOffer && (
            <Link
              href={buildRatingUrl(token)}
              className="mt-4 inline-block rounded-md bg-[#1e3a5f] px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#2a4f7f]"
            >
              ⭐ Gi vurdering
            </Link>
          )}
        </div>
      </div>
    );
  }

  // 5. If offer is not in "replied" status — cannot accept
  if (offerData.status !== OfferStatus.Replied) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-lg rounded-lg bg-white p-8 shadow-lg">
          <h1 className="mb-2 text-xl font-bold text-[#1e3a5f]">
            Tilbudet er ikke klart
          </h1>
          <p className="text-gray-600">
            Dette tilbudet har ikke blitt sendt inn av selskapet ennå, eller er
            ikke lenger tilgjengelig.
          </p>
        </div>
      </div>
    );
  }

  // 6. Show offer details + accept button
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-8 shadow-lg">
        <h1 className="mb-2 text-xl font-bold text-[#1e3a5f]">
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
            <span className="text-gray-600">Totalpris</span>
            <span className="text-lg font-bold text-[#1e3a5f]">
              {offerData.price?.toLocaleString("nb-NO")} NOK
            </span>
          </div>


          {offerData.hourlyRate && (
            <div className="flex justify-between">
              <span className="text-gray-600">Timepris overflygning</span>
              <span className="font-medium">
                {offerData.hourlyRate.toLocaleString("nb-NO")} NOK/t
              </span>
            </div>
          )}
          {offerData.hivRate && (
            <div className="flex justify-between">
              <span className="text-gray-600">Timepris m/hiv</span>
              <span className="font-medium">
                {offerData.hivRate.toLocaleString("nb-NO")} NOK/t
              </span>
            </div>
          )}
          {offerData.comment && (
            <div className="border-t pt-3">
              <span className="text-gray-600">Kommentar fra selskapet</span>
              <p className="mt-1 text-gray-800">{offerData.comment}</p>
            </div>
          )}
        </div>

        <AcceptButton token={token} />
      </div>
    </div>
  );
}