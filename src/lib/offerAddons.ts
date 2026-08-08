// Tilleggskostnader selskapet kan legge til et tilbud (inspirert av Vortix),
// pluss delt logikk/tekst for at prisen alltid vises som veiledende.

import type { OfferAddon } from "@/types";

export type { OfferAddon };

export interface OfferAddonDefinition {
  key: string;
  label: string;
}

export const OFFER_ADDON_DEFINITIONS: OfferAddonDefinition[] = [
  { key: "tilflyging", label: "Tilflyging" },
  { key: "ventetid", label: "Ventetid" },
  { key: "nettleie", label: "Nettleie" },
  { key: "ekstra_mannskap", label: "Ekstra mannskap" },
];

/** Grand total shown to kunden: grunnpris + alle tillegg. */
export function calculateOfferTotal(price: number, addons: OfferAddon[]): number {
  return price + addons.reduce((sum, a) => sum + a.price, 0);
}

// Vises til selskapet når de fyller ut tilbudet, og til kunden i e-post og
// på aksept-siden — prisen skal aldri fremstå som en bindende fastpris,
// siden vær og forhold på oppdragsdagen kan endre den.
export const OFFER_PRICE_DISCLAIMER =
  "Prisen er veiledende og kan bli justert på oppdragsdagen på grunn av vær, føre eller andre forhold utenfor selskapets kontroll.";
