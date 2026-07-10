import Link from "next/link";

export const metadata = {
  title: "Personvernerklæring — BestilleHelikopter.no",
};

export default function PersonvernPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/" className="mb-6 inline-block text-sm text-blue-600 hover:underline">
        ← Tilbake til forsiden
      </Link>

      <h1 className="mb-6 text-3xl font-bold text-gray-900">Personvernerklæring</h1>
      <p className="mb-4 text-sm text-gray-600">Sist oppdatert: mars 2026</p>
      <p className="mb-8 text-gray-700">
        Behandlingsansvarlig: [SELSKAPSNAVN], org.nr. [ORG.NR], e-post: [E-POST].
      </p>

      <div className="space-y-6 text-gray-700 leading-relaxed">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">1. Hvilke opplysninger vi samler inn</h2>
          <ul className="ml-5 list-disc space-y-1">
            <li>Kontaktinformasjon: navn, e-postadresse, telefonnummer</li>
            <li>Firmainformasjon: firmanavn, org.nr., fakturaadresse (valgfritt)</li>
            <li>Oppdragsinformasjon: koordinater, last, dato, bilder du laster opp</li>
            <li>Teknisk: anonymisert session-ID, sidevisninger (ingen informasjonskapsler fra tredjepart)</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">2. Formål og rettslig grunnlag</h2>
          <ul className="ml-5 list-disc space-y-1">
            <li>Formidling av forespørsler til helikopterselskap (oppfyllelse av avtale, GDPR art. 6(1)(b))</li>
            <li>E-postvarsler om tilbud og status (berettiget interesse, GDPR art. 6(1)(f))</li>
            <li>Anonym bruksstatistikk for forbedring av tjenesten (berettiget interesse)</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">3. Hvem vi deler data med</h2>
          <p>
            Oppdragsinformasjonen din deles med helikopterselskapet som vurderer forespørselen. Vi
            selger aldri data til tredjeparter. Underleverandører: Firebase (Google, EU), SendGrid
            (Twilio) for e-post.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">4. Lagring og sletting</h2>
          <p>
            Forespørsler og tilhørende data slettes automatisk 6 måneder etter opprettelse. Du kan
            be om sletting når som helst ved å kontakte oss.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">5. Dine rettigheter</h2>
          <p>
            Du har rett til innsyn, retting, sletting, begrensning og dataportabilitet. Kontakt oss
            på [E-POST]. Du kan også klage til Datatilsynet.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">6. Informasjonskapsler og sporing</h2>
          <p>
            Vi bruker ingen tredjeparts informasjonskapsler. Vi bruker en anonym session-ID
            (sessionStorage) for intern bruksstatistikk. Ingen data sendes til Google Analytics eller
            lignende tjenester.
          </p>
        </section>
      </div>
    </main>
  );
}

