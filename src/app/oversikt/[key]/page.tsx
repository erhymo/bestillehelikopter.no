import { adminDb } from "@/lib/firebase/admin";
import { RECIPIENT_COMPANY_ID } from "@/lib/recipientCompany";
import { OfferStatus, JobStatus } from "@/types";
import { Logo } from "@/components/ui/logo";
import { trackServerPageView } from "@/lib/analytics-server";

interface PageProps {
  params: Promise<{ key: string }>;
}

interface JobRow {
  id: string;
  customerName: string;
  desiredDate: string;
  flexibleDate: boolean;
  hiveOrPax: number;
  transportType: "sling" | "passenger";
  dropCount: number;
  createdAt: string;
  priority: number;
  label: string;
  urgent: boolean;
  actionLabel: string | null;
  actionHref: string | null;
}

export default async function OverviewPage({ params }: PageProps) {
  const { key } = await params;

  // 1. Verify the shared dashboard key against the company doc
  const companySnap = await adminDb.doc(`companies/${RECIPIENT_COMPANY_ID}`).get();
  const companyData = companySnap.data();

  if (!companySnap.exists || !companyData?.dashboardKey || companyData.dashboardKey !== key) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <Logo className="mb-8" iconClassName="h-6 w-6" />
        <div className="rounded-lg bg-white p-8 text-center shadow-lg">
          <h1 className="mb-2 text-xl font-bold text-red-600">Ugyldig lenke</h1>
          <p className="text-gray-600">
            Denne lenken er ikke gyldig. Kontakt oss hvis du mener dette er en
            feil.
          </p>
        </div>
      </main>
    );
  }

  trackServerPageView("company_overview");

  // 2. Fetch open + accepted jobs
  const snap = await adminDb
    .collection("jobs")
    .where("status", "in", [JobStatus.Open, JobStatus.Accepted])
    .orderBy("createdAt", "desc")
    .limit(200)
    .get();

  const jobs: JobRow[] = await Promise.all(
    snap.docs.map(async (doc) => {
      const d = doc.data();
      const offersSnap = await adminDb.collection(`jobs/${doc.id}/offers`).limit(1).get();
      const offer = offersSnap.docs[0]?.data();
      const token = offer?.token as string | undefined;

      const drops = Array.isArray(d.drops) ? d.drops : [];
      const estimates = Array.isArray(d.estimates) ? d.estimates : [];
      const transportType = d.transportType === "passenger" ? "passenger" : "sling";
      const hiveOrPax =
        transportType === "sling"
          ? estimates.reduce((sum: number, e: { hiveCount?: number }) => sum + (e.hiveCount ?? 1), 0)
          : drops.reduce((sum: number, dr: { passengers?: number }) => sum + (dr.passengers ?? 0), 0);

      let priority: number;
      let label: string;
      let urgent: boolean;
      let actionLabel: string | null;
      let actionHref: string | null;

      if (d.status === JobStatus.Accepted) {
        if (d.confirmedDate) {
          priority = 3;
          label = `Bekreftet: ${d.confirmedDate} kl. ${d.confirmedTime ?? "?"}`;
          urgent = false;
          actionLabel = "Endre tidspunkt";
          actionHref = token ? `/c/${encodeURIComponent(token)}/register` : null;
        } else {
          priority = 1;
          label = "Akseptert av kunde — registrer tidspunkt";
          urgent = true;
          actionLabel = "Registrer";
          actionHref = token ? `/c/${encodeURIComponent(token)}/register` : null;
        }
      } else if (offer?.status === OfferStatus.Replied) {
        priority = 2;
        label = "Tilbud sendt — venter på kunde";
        urgent = false;
        actionLabel = "Se tilbud";
        actionHref = token ? `/c/${encodeURIComponent(token)}/offer` : null;
      } else {
        priority = 0;
        label = "Venter på tilbud fra dere";
        urgent = true;
        actionLabel = "Gi tilbud";
        actionHref = token ? `/c/${encodeURIComponent(token)}/offer` : null;
      }

      return {
        id: doc.id,
        customerName: d.customer?.name ?? "Ukjent",
        desiredDate: d.desiredDate ?? "",
        flexibleDate: !!d.flexibleDate,
        hiveOrPax,
        transportType,
        dropCount: drops.length,
        createdAt: d.createdAt?.toDate?.()?.toISOString() ?? "",
        priority,
        label,
        urgent,
        actionLabel,
        actionHref,
      };
    }),
  );

  jobs.sort((a, b) => a.priority - b.priority || b.createdAt.localeCompare(a.createdAt));

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Logo className="mb-8" iconClassName="h-6 w-6" />
      <h1 className="mb-1 text-2xl font-bold text-gray-900">Åpne forespørsler</h1>
      <p className="mb-6 text-sm text-gray-600">
        Alle forespørsler som venter på tilbud, kundesvar eller registrering av
        tidspunkt.
      </p>

      {jobs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-600">
          Ingen åpne forespørsler akkurat nå.
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div
              key={job.id}
              className={`flex flex-col gap-3 rounded-lg border bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between ${
                job.urgent ? "border-amber-300" : "border-gray-200"
              }`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-gray-900">{job.customerName}</span>
                  <span className="text-sm text-gray-500">
                    {job.desiredDate || "Ikke spesifisert"}
                    {job.flexibleDate ? " (fleksibel)" : ""}
                  </span>
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  {job.transportType === "sling" ? `${job.hiveOrPax} hiv` : `${job.hiveOrPax} passasjerer`}
                  {job.dropCount > 1 ? " · flere dropp-punkter" : ""}
                </div>
                <div
                  className={`mt-1.5 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    job.urgent
                      ? "bg-amber-100 text-amber-800"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {job.label}
                </div>
              </div>

              {job.actionHref && (
                <a
                  href={job.actionHref}
                  className="shrink-0 rounded-lg bg-brand-700 px-4 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-brand-600"
                >
                  {job.actionLabel}
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
