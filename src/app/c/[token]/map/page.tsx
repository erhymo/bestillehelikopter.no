import { verifyOfferToken } from "@/lib/tokens";
import { adminDb } from "@/lib/firebase/admin";
import { MapView, type MapViewData } from "@/components/map/map-view";
import { trackServerPageView } from "@/lib/analytics-server";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function CompanyMapPage({ params }: PageProps) {
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

  // 2. Fetch job document
  const jobSnap = await adminDb.doc(`jobs/${jobId}`).get();
  if (!jobSnap.exists) {
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

  const data: MapViewData = {
    jobId,
    companyId,
    pickup: jobData.pickup,
    drops: jobData.drops ?? [],
    estimates: jobData.estimates ?? [],
    totalFlightTimeMin: jobData.totalFlightTimeMin ?? 0,
    desiredDate: jobData.desiredDate ?? "",
    flexibleDate: jobData.flexibleDate ?? false,
    nettbruk: jobData.nettbruk ?? false,
    over15m: jobData.over15m ?? false,
  };

  // 3. Log map_view event (fire-and-forget)
  trackServerPageView("company_map");
  adminDb
    .collection("events")
    .add({
      type: "map_view",
      jobId,
      companyId,
      offerId,
      createdAt: new Date().toISOString(),
    })
    .catch((err: unknown) =>
      console.error("[map-page] Failed to log map_view event:", err),
    );

  return <MapView data={data} />;
}

