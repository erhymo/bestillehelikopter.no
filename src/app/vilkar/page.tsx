import Link from "next/link";

export const metadata = {
  title: "Vilkår for bruk — BestilleHelikopter.no",
};

export default function VilkarPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/" className="mb-6 inline-block text-sm text-blue-600 hover:underline">
        ← Tilbake til forsiden
      </Link>

      <h1 className="mb-6 text-3xl font-bold text-gray-900">Vilkår for bruk</h1>
      <p className="mb-8 text-sm text-gray-600">Sist oppdatert: mars 2026</p>

      <div className="space-y-6 text-gray-700 leading-relaxed">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">1. Om tjenesten</h2>
          <p>
            BestilleHelikopter.no («Plattformen») er en formidlingstjeneste som kobler kunder med
            helikopterselskaper. Plattformen eies og driftes av [SELSKAPSNAVN], org.nr. [ORG.NR].
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">2. Plattformens rolle</h2>
          <p>
            Plattformen er en nøytral mellompart. Vi er ikke part i avtalen mellom kunde og
            helikopterselskap, og har ikke ansvar for utførelsen av flytjenester. Alle avtaler om
            pris, tid og vilkår inngås direkte mellom kunde og selskap.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">3. Forespørsler og tilbud</h2>
          <p>
            En innsendt forespørsel er uforpliktende. Et mottatt tilbud er uforpliktende inntil
            kunden aktivt aksepterer det. Etter aksept gjelder helikopterselskapets egne vilkår.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">4. Priser</h2>
          <p>
            Prisene i tilbudet er veiledende og kan avvike fra endelig faktura dersom oppdraget
            endres underveis (f.eks. ekstra flygetid, venting, endret last). Plattformen har ikke
            ansvar for prisavvik.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">5. Bruk av tjenesten</h2>
          <p>
            Du samtykker til å oppgi korrekt kontaktinformasjon og beskrive oppdraget etter beste
            evne. Misbruk av plattformen kan føre til utestengelse.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">6. Ansvarsbegrensning</h2>
          <p>
            Plattformen er ikke ansvarlig for tap, skade eller forsinkelse som følge av
            helikoptertransporten. Helikopterselskapet er ansvarlig for gjennomføring i henhold til
            gjeldende luftfartsregelverk.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">7. Endringer</h2>
          <p>
            Vi forbeholder oss retten til å endre disse vilkårene. Vesentlige endringer varsles på
            plattformen.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">8. Lovvalg og tvister</h2>
          <p>
            Vilkårene er underlagt norsk rett. Tvister søkes løst i minnelighet. Verneting er [STED]
            tingrett.
          </p>
        </section>
      </div>
    </main>
  );
}

