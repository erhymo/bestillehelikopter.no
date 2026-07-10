import { adminDb } from "@/lib/firebase/admin";
import { notFound } from "next/navigation";
import { trackServerPageView } from "@/lib/analytics-server";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CompanyPublicPage({ params }: Props) {
  const { id } = await params;

  // Fetch company
  const companySnap = await adminDb.doc(`companies/${id}`).get();
  if (!companySnap.exists) notFound();

  trackServerPageView("company_public");
  const company = companySnap.data()!;
  const { name, avgRating, ratingCount } = company as {
    name: string;
    avgRating: number;
    ratingCount: number;
  };

  // Fetch approved ratings
  const ratingsSnap = await adminDb
    .collection("ratings")
    .where("companyId", "==", id)
    .where("approved", "==", true)
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();

  const ratings = ratingsSnap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      score: d.score as number,
      comment: d.comment as string,
      createdAt: d.createdAt?.toDate?.()?.toISOString?.() ?? "",
    };
  });

  return (
    <div className="flex min-h-screen justify-center bg-gray-50 p-4 pt-12">
      <div className="w-full max-w-2xl">
        {/* Company header */}
        <div className="mb-8 rounded-lg bg-white p-8 shadow-lg text-center">
          <h1 className="mb-2 text-2xl font-bold text-[#1e3a5f]">{name}</h1>
          {ratingCount > 0 ? (
            <div className="flex items-center justify-center gap-2">
              <span className="text-3xl font-bold text-yellow-500">
                {"⭐".repeat(Math.round(avgRating))}
              </span>
              <span className="text-lg font-semibold text-gray-700">
                {avgRating.toFixed(1)}
              </span>
              <span className="text-gray-600">
                ({ratingCount} {ratingCount === 1 ? "vurdering" : "vurderinger"})
              </span>
            </div>
          ) : (
            <p className="text-gray-600">Ingen vurderinger ennå</p>
          )}
        </div>

        {/* Approved ratings */}
        {ratings.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-[#1e3a5f]">Vurderinger</h2>
            {ratings.map((r) => (
              <div key={r.id} className="rounded-lg bg-white p-5 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-lg">
                    {"⭐".repeat(r.score)}{"☆".repeat(5 - r.score)}
                  </span>
                  {r.createdAt && (
                    <span className="text-xs text-gray-600">
                      {new Date(r.createdAt).toLocaleDateString("nb-NO")}
                    </span>
                  )}
                </div>
                {r.comment && (
                  <p className="text-sm text-gray-700">{r.comment}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

