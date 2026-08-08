import { Lock, XCircle, Clock, Star } from "lucide-react";
import { verifyOfferToken } from "@/lib/tokens";
import { adminDb } from "@/lib/firebase/admin";
import { JobStatus } from "@/types";
import RatingForm from "@/components/rating/rating-form";
import { TokenPageLayout } from "@/components/token-pages/token-page-layout";
import { trackServerPageView, trackServerFunnel } from "@/lib/analytics-server";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function RatePage({ params }: Props) {
  const { token } = await params;

  // 1. Verify token
  const payload = verifyOfferToken(decodeURIComponent(token));
  if (!payload) {
    return (
      <TokenPageLayout>
        <div className="rounded-lg bg-white p-8 text-center shadow-lg">
          <Lock className="mx-auto mb-3 h-10 w-10 text-gray-400" />
          <h1 className="mb-2 text-xl font-bold text-brand-700">Ugyldig lenke</h1>
          <p className="text-gray-600">Lenken er ugyldig eller utløpt.</p>
        </div>
      </TokenPageLayout>
    );
  }

  const { jobId, companyId } = payload;

  // Analytics (fire-and-forget)
  trackServerPageView("customer_rating");
  trackServerFunnel("rating_viewed");

  // 2. Fetch job + company
  const [jobSnap, companySnap] = await Promise.all([
    adminDb.doc(`jobs/${jobId}`).get(),
    adminDb.doc(`companies/${companyId}`).get(),
  ]);

  if (!jobSnap.exists || !companySnap.exists) {
    return (
      <TokenPageLayout>
        <div className="rounded-lg bg-white p-8 text-center shadow-lg">
          <XCircle className="mx-auto mb-3 h-10 w-10 text-red-500" />
          <h1 className="mb-2 text-xl font-bold text-brand-700">Ikke funnet</h1>
          <p className="text-gray-600">Oppdraget eller selskapet ble ikke funnet.</p>
        </div>
      </TokenPageLayout>
    );
  }

  const jobData = jobSnap.data()!;
  const companyData = companySnap.data()!;
  const companyName = companyData.name as string;

  // 3. Check job status
  if (
    jobData.status !== JobStatus.Accepted &&
    jobData.status !== JobStatus.Completed
  ) {
    return (
      <TokenPageLayout>
        <div className="rounded-lg bg-white p-8 text-center shadow-lg">
          <Clock className="mx-auto mb-3 h-10 w-10 text-gray-400" />
          <h1 className="mb-2 text-xl font-bold text-brand-700">Kan ikke gi vurdering ennå</h1>
          <p className="text-gray-600">Du kan gi vurdering først etter at oppdraget er akseptert.</p>
        </div>
      </TokenPageLayout>
    );
  }

  // 4. Check if already rated
  const existingRating = await adminDb
    .collection("ratings")
    .where("jobId", "==", jobId)
    .limit(1)
    .get();

  if (!existingRating.empty) {
    const ratingData = existingRating.docs[0].data();
    return (
      <TokenPageLayout>
        <div className="rounded-lg bg-white p-8 text-center shadow-lg">
          <Star className="mx-auto mb-3 h-10 w-10 fill-yellow-400 text-yellow-400" />
          <h1 className="mb-2 text-xl font-bold text-brand-700">Allerede vurdert</h1>
          <p className="text-gray-600">
            Du har allerede gitt {companyName}{" "}
            <span className="font-semibold">{ratingData.score} av 5</span> stjerner.
          </p>
          {ratingData.comment && (
            <p className="mt-2 italic text-gray-600">&quot;{ratingData.comment}&quot;</p>
          )}
        </div>
      </TokenPageLayout>
    );
  }

  // 5. Log rating_view event (fire-and-forget)
  adminDb
    .collection("events")
    .add({
      type: "rating_submitted",
      jobId,
      companyId,
      metadata: { action: "view" },
      createdAt: new Date().toISOString(),
    })
    .catch(() => {});

  // 6. Render rating form
  return (
    <TokenPageLayout>
      <div className="rounded-lg bg-white p-8 shadow-lg">
        <h1 className="mb-1 text-center text-xl font-bold text-brand-700">
          Gi vurdering
        </h1>
        <p className="mb-6 text-center text-gray-600">
          Hvordan var din opplevelse med <span className="font-semibold">{companyName}</span>?
        </p>
        <RatingForm token={token} companyName={companyName} />
      </div>
    </TokenPageLayout>
  );
}
