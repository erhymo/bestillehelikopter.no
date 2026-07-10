import Link from "next/link";

export const metadata = {
  title: "Ansvarsfraskrivelse — BestilleHelikopter.no",
};

export default function AnsvarsfraskrivelsePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/" className="mb-6 inline-block text-sm text-blue-600 hover:underline">
        ← Tilbake til forsiden
      </Link>

      <h1 className="mb-6 text-3xl font-bold text-gray-900">Ansvarsfraskrivelse</h1>

      <div className="space-y-4 text-gray-700 leading-relaxed">
        <p>
          BestilleHelikopter.no er en formidlingsplattform og ikke et flyselskap. Vi utfører ingen
          flytjenester selv.
        </p>

        <p>
          Flygetidsestimater på plattformen er omtrentlige og beregnet ut fra luftlinje, terreng og
          typiske hastigheter. De er ment som veiledning og kan avvike vesentlig fra faktisk
          flygetid.
        </p>

        <p>
          Helikopterselskapet er fullt ansvarlig for sikkerhet, gjennomføring og overholdelse av
          gjeldende luftfartsregelverk (BSL, EASA). Plattformen har intet ansvar for forhold knyttet
          til selve flytjenesten.
        </p>
      </div>
    </main>
  );
}

