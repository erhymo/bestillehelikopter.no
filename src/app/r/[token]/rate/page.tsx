import { verifyOfferToken } from "@/lib/tokens";
import { adminDb } from "@/lib/firebase/admin";
import { JobStatus } from "@/types";
import RatingForm from "@/components/rating/rating-form";
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
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-lg rounded-lg bg-white p-8 shadow-lg text-center">
          <div className="mb-3 text-4xl">🔒</div>
          <h1 className="mb-2 text-xl font-bold text-[#1e3a5f]">Ugyldig lenke</h1>
          <p className="text-gray-600">Lenken er ugyldig eller utløpt.</p>
        </div>
      </div>
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
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-lg rounded-lg bg-white p-8 shadow-lg text-center">
          <div className="mb-3 text-4xl">❌</div>
          <h1 className="mb-2 text-xl font-bold text-[#1e3a5f]">Ikke funnet</h1>
          <p className="text-gray-600">Oppdraget eller selskapet ble ikke funnet.</p>
        </div>
      </div>
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
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-lg rounded-lg bg-white p-8 shadow-lg text-center">
          <div className="mb-3 text-4xl">⏳</div>
          <h1 className="mb-2 text-xl font-bold text-[#1e3a5f]">Kan ikke gi vurdering ennå</h1>
          <p className="text-gray-600">Du kan gi vurdering først etter at oppdraget er akseptert.</p>
        </div>
      </div>
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
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-lg rounded-lg bg-white p-8 shadow-lg text-center">
          <div className="mb-3 text-4xl">⭐</div>
          <h1 className="mb-2 text-xl font-bold text-[#1e3a5f]">Allerede vurdert</h1>
          <p className="text-gray-600">
            Du har allerede gitt {companyName}{" "}
            <span className="font-semibold">{ratingData.score} av 5</span> stjerner.
          </p>
          {ratingData.comment && (
            <p className="mt-2 italic text-gray-600">&quot;{ratingData.comment}&quot;</p>
          )}
        </div>
      </div>
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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-8 shadow-lg">
        <h1 className="mb-1 text-center text-xl font-bold text-[#1e3a5f]">
          Gi vurdering
        </h1>
        <p className="mb-6 text-center text-gray-600">
          Hvordan var din opplevelse med <span className="font-semibold">{companyName}</span>?
        </p>
        <RatingForm token={token} companyName={companyName} />
      </div>
    </div>
  );
}

