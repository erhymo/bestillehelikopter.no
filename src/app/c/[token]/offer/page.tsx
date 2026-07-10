import { verifyOfferToken } from "@/lib/tokens";
import { adminDb } from "@/lib/firebase/admin";
import { OfferForm } from "@/components/offer/offer-form";
import { OfferStatus } from "@/types";
import { trackServerPageView, trackServerFunnel } from "@/lib/analytics-server";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function CompanyOfferPage({ params }: PageProps) {
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

  // 3. Log offer_view event (fire-and-forget)
  trackServerPageView("company_offer");
  trackServerFunnel("offer_viewed");
  adminDb
    .collection("events")
    .add({
      type: "offer_view",
      jobId,
      companyId,
      offerId,
      createdAt: new Date().toISOString(),
    })
    .catch((err: unknown) =>
      console.error("[offer-page] Failed to log offer_view event:", err),
    );

  // 4. If already replied — show confirmation
  const alreadyReplied =
    offerData.status === OfferStatus.Replied ||
    offerData.status === OfferStatus.Accepted ||
    offerData.status === OfferStatus.Closed;

  if (alreadyReplied) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-lg rounded-lg bg-white p-8 shadow-lg">
          <h1 className="mb-4 text-xl font-bold text-[#1e3a5f]">
            Tilbud allerede sendt
          </h1>
          <div className="space-y-3 rounded-lg bg-gray-50 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Totalpris</span>
              <span className="font-semibold">
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
                <span className="text-gray-600">Kommentar</span>
                <p className="mt-1 text-gray-800">{offerData.comment}</p>
              </div>
            )}
          </div>
          <p className="mt-4 text-center text-sm text-gray-600">
            Du kan ikke endre tilbudet etter at det er sendt.
          </p>
        </div>
      </div>
    );
  }

  // 5. Show offer form
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-8 shadow-lg">
        <h1 className="mb-2 text-xl font-bold text-[#1e3a5f]">Gi tilbud</h1>
        <p className="mb-6 text-sm text-gray-600">
          Fyll ut prisene og send tilbudet til kunden.
        </p>
        <OfferForm
          token={token}
          companyName={companyName}
          totalFlightTimeMin={jobData.totalFlightTimeMin ?? 0}
          dropCount={jobData.drops?.length ?? 0}
        />
      </div>
    </div>
  );
}

