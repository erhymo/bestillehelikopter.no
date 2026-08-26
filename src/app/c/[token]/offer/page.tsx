import { verifyOfferToken } from "@/lib/tokens";
import { adminDb } from "@/lib/firebase/admin";
import { OfferWizard } from "@/components/offer/offer-wizard";
import { TokenPageLayout } from "@/components/token-pages/token-page-layout";
import { OfferStatus, type OfferAddon } from "@/types";
import { OFFER_PRICE_DISCLAIMER } from "@/lib/offerAddons";
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
    const addons: OfferAddon[] = Array.isArray(offerData.addons) ? offerData.addons : [];
    const grandTotal = offerData.totalPrice ?? offerData.price ?? 0;
    return (
      <TokenPageLayout>
        <div className="rounded-lg bg-white p-8 shadow-lg">
          <h1 className="mb-4 text-xl font-bold text-brand-700">
            Tilbud allerede sendt
          </h1>
          <div className="space-y-3 rounded-lg bg-gray-50 p-4 text-sm">
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
              <span className="font-semibold text-gray-900">Totalt tilbud</span>
              <span className="font-bold text-brand-700">
                {grandTotal.toLocaleString("nb-NO")} NOK
              </span>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500">{OFFER_PRICE_DISCLAIMER}</p>
          <p className="mt-4 text-center text-sm text-gray-600">
            Du kan ikke endre tilbudet etter at det er sendt.
          </p>
        </div>
      </TokenPageLayout>
    );
  }

  // 5. Show offer wizard
  const drops = Array.isArray(jobData.drops) ? jobData.drops : [];
  const transportType = jobData.transportType === "sling" ? "sling" : "passenger";
  const estimates = Array.isArray(jobData.estimates) ? jobData.estimates : [];
  const totalHiveCount =
    transportType === "sling"
      ? estimates.reduce(
          (sum: number, e: { hiveCount?: number }) => sum + (e.hiveCount ?? 1),
          0,
        )
      : drops.reduce(
          (sum: number, d: { passengers?: number }) => sum + (d.passengers ?? 0),
          0,
        );

  return (
    <TokenPageLayout>
      <div className="rounded-lg bg-white p-8 shadow-lg">
        <h1 className="mb-2 text-xl font-bold text-brand-700">Gi tilbud</h1>
        <p className="mb-6 text-sm text-gray-600">
          Fyll ut oppdragsinfo, se kartet og legg inn priser. Du kan gå tilbake
          og endre før du sender tilbudet til kunden.
        </p>
        <OfferWizard
          token={token}
          companyName={companyName}
          job={{
            customerName: jobData.customer?.name ?? "",
            pickup: {
              lat: jobData.pickup?.lat ?? 0,
              lng: jobData.pickup?.lng ?? 0,
              address: jobData.pickup?.address,
            },
            drops: drops.map((d: { lat: number; lng: number; address?: string; hpieces?: number; passengers?: number }) => ({
              lat: d.lat,
              lng: d.lng,
              address: d.address,
              hpieces: d.hpieces ?? 0,
              passengers: d.passengers ?? 0,
            })),
            transportType,
            desiredDate: jobData.desiredDate ?? "",
            desiredTime: jobData.desiredTime ?? "",
            flexibleDate: !!jobData.flexibleDate,
            notes: jobData.notes ?? "",
            totalFlightTimeMin: jobData.totalFlightTimeMin ?? 0,
            totalHiveCount,
          }}
        />
      </div>
    </TokenPageLayout>
  );
}
