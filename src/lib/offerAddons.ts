// Selskapet fyller kun inn timepris og oppmøte/tilflyging-pris — pluss delt
// logikk/tekst for at prisen alltid vises som veiledende.

import type { OfferAddon } from "@/types";

export type { OfferAddon };

export const TILFLYGNING_ADDON_KEY = "tilflyging_oppmote";
export const TILFLYGNING_ADDON_LABEL = "Tilflygning/oppmøte";

/**
 * Grunnpris (flykostnad) = timepris × estimert flytid. Selskapet fyller inn
 * timepris; systemet gjør multiplikasjonen — ikke selskapet selv — slik at
 * grunnprisen alltid stemmer med jobbens faktiske flytidsestimat.
 */
export function calculateFlightCost(hourlyRateNok: number, flightTimeMin: number): number {
  return Math.round(hourlyRateNok * (flightTimeMin / 60));
}

// Vises til selskapet når de fyller ut tilbudet, og til kunden i e-post og
// på aksept-siden — prisen skal aldri fremstå som en bindende fastpris,
// siden vær og forhold på oppdragsdagen kan endre den.
export const OFFER_PRICE_DISCLAIMER =
  "Prisen er veiledende og kan bli justert på oppdragsdagen på grunn av vær, føre eller andre forhold utenfor selskapets kontroll.";
