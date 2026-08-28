import type { ReactNode } from "react";
import { OFFER_PRICE_DISCLAIMER } from "@/lib/offerAddons";
import { formatDateNorwegian } from "@/lib/formatDate";
import type { OfferAddon } from "@/types";

interface EditableTotalPrice {
  value: string;
  onChange: (value: string) => void;
}

interface EditableComment {
  value: string;
  onChange: (value: string) => void;
}

interface OfferPreviewProps {
  customerName: string;
  companyName: string;
  /** Kundens ønskede dato (ISO, YYYY-MM-DD) — vist så kunden kan verifisere at det stemmer. */
  desiredDate?: string;
  desiredTime?: string;
  flexibleDate?: boolean;
  flightCost: number;
  addons: OfferAddon[];
  totalPrice: number;
  /** If set, totalpris vises som et redigerbart felt i stedet for statisk tekst. */
  editableTotalPrice?: EditableTotalPrice;
  /** Selskapets melding til kunden. Statisk (og kun vist hvis satt) med mindre editableComment er gitt. */
  comment?: string | null;
  /** If set, meldingen vises som et redigerbart tekstfelt i stedet for statisk tekst. */
  editableComment?: EditableComment;
  /** Knapp/handling nederst — ekte AcceptButton på kundens side, evt. en forhåndsvisning hos selskapet. */
  actionSlot: ReactNode;
  /** Ytre kortstil — "page" (skygge, matcher andre token-sider) eller "embedded" (tynn ramme, sitter inni veiviseren). */
  variant?: "page" | "embedded";
}

/**
 * Nøyaktig det kunden ser når tilbudet kommer på e-post og på aksept-siden.
 * Brukes både der (statisk pris) og i steg 2 av selskapets tilbudsveiviser
 * (redigerbar pris) — slik at de to alltid er identiske utenom prisfeltet.
 */
export function OfferPreview({
  customerName,
  companyName,
  desiredDate,
  desiredTime,
  flexibleDate,
  flightCost,
  addons,
  totalPrice,
  editableTotalPrice,
  comment,
  editableComment,
  actionSlot,
  variant = "page",
}: OfferPreviewProps) {
  return (
    <div
      className={
        variant === "page"
          ? "rounded-lg bg-white p-8 shadow-lg"
          : "rounded-lg border border-gray-200 bg-white p-6"
      }
    >
      <p className="mb-1 text-gray-800">Hei {customerName || "der"},</p>
      <p className="mb-6 text-gray-700">
        Takk for at du sendte oss en forespørsel om helikoptertransport. Her er tilbudet vårt til deg:
      </p>

      <div className="mb-6 space-y-3 rounded-lg bg-gray-50 p-4 text-sm">
        {desiredDate && (
          <div className="flex justify-between">
            <span className="text-gray-600">Ønsket dato</span>
            <span className="font-semibold">
              {formatDateNorwegian(desiredDate)}
              {desiredTime ? ` kl. ${desiredTime}` : ""}
              {flexibleDate ? " (fleksibel)" : ""}
            </span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-gray-600">Selskap</span>
          <span className="font-semibold">{companyName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Flytidskostnad</span>
          <span className="font-medium">{flightCost.toLocaleString("nb-NO")} NOK</span>
        </div>
        {addons.map((a) => (
          <div key={a.key} className="flex justify-between text-gray-600">
            <span>{a.label}</span>
            <span>{a.price.toLocaleString("nb-NO")} NOK</span>
          </div>
        ))}
        <div className="flex items-center justify-between border-t pt-2">
          <span className="font-semibold text-gray-900">Totalpris</span>
          {editableTotalPrice ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="1"
                step="1"
                value={editableTotalPrice.value}
                onChange={(e) => editableTotalPrice.onChange(e.target.value)}
                className="w-32 rounded-lg border px-2.5 py-1 text-right text-lg font-bold text-brand-700 focus:border-brand-700 focus:outline-none focus:ring-1 focus:ring-brand-700"
              />
              <span className="text-sm font-medium text-gray-600">NOK</span>
            </div>
          ) : (
            <span className="text-lg font-bold text-brand-700">
              {totalPrice.toLocaleString("nb-NO")} NOK
            </span>
          )}
        </div>
      </div>

      {editableComment ? (
        <div className="mb-6">
          <label className="mb-1 block text-sm font-semibold text-gray-700">
            Melding til kunden (valgfritt)
          </label>
          <textarea
            value={editableComment.value}
            onChange={(e) => editableComment.onChange(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="F.eks. «Vi kan ta oppdraget litt senere på dagen om det passer, ca. 17:00.»"
            className="w-full rounded-lg border px-3 py-2 text-sm focus:border-brand-700 focus:outline-none focus:ring-1 focus:ring-brand-700"
          />
        </div>
      ) : (
        comment && (
          <div className="mb-6 rounded-lg bg-brand-50 p-4 text-sm">
            <p className="mb-1 font-semibold text-brand-900">Melding fra {companyName}</p>
            <p className="whitespace-pre-wrap text-gray-800">{comment}</p>
          </div>
        )
      )}

      <p className="mb-6 text-xs text-gray-500">{OFFER_PRICE_DISCLAIMER}</p>

      <p className="mb-6 text-gray-700">
        Har du spørsmål er det bare å ta kontakt. Vi ser frem til å høre fra deg!
      </p>

      {actionSlot}
    </div>
  );
}
