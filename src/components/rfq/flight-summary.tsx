"use client";

import type { FlightEstimate } from "@/types";

interface FlightSummaryProps {
  estimates: FlightEstimate[];
  totalFlightTimeMin: number;
}

const LABELS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function FlightSummary({
  estimates,
  totalFlightTimeMin,
}: FlightSummaryProps) {
  if (estimates.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-sm text-gray-600">
        Legg til hentepunkt og leveringspunkter for å se flytidsestimat.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-gray-900">
        Flytidsestimat (veiledende)
      </h3>

      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-600">
                Punkt
              </th>
              <th className="px-3 py-2 text-right font-medium text-gray-600">
                Avstand
              </th>
              <th className="px-3 py-2 text-right font-medium text-gray-600">
                Høydeforskjell
              </th>
              <th className="px-3 py-2 text-right font-medium text-gray-600">
                Hiv
              </th>
              <th className="px-3 py-2 text-right font-medium text-gray-600">
                Flytid
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {estimates.map((est) => (
              <tr key={est.dropIndex}>
                <td className="px-3 py-2 font-medium">
                  {LABELS[est.dropIndex] ?? est.dropIndex + 1}
                </td>
                <td className="px-3 py-2 text-right text-gray-600">
                  {est.distanceKm} km
                </td>
                <td className="px-3 py-2 text-right text-gray-600">
                  {est.elevGainM} m
                </td>
                <td className="px-3 py-2 text-right text-gray-600">
                  {est.hiveCount}×
                </td>
                <td className="px-3 py-2 text-right font-medium">
                  {est.flightTimeMin} min
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-blue-50">
            <tr>
              <td
                colSpan={4}
                className="px-3 py-2 font-medium text-blue-900"
              >
                Totalt estimert flytid
              </td>
              <td className="px-3 py-2 text-right font-bold text-blue-900">
                {totalFlightTimeMin} min
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="text-xs text-gray-600">
        Estimatet er veiledende og tar ikke hensyn til vind, vær eller
        begrensninger på landingsplassen.
      </p>
    </div>
  );
}

