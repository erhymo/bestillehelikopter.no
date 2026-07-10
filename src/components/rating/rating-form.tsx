"use client";

import { useState } from "react";
import { useAnalytics } from "@/hooks/use-analytics";

interface RatingFormProps {
  token: string;
  companyName: string;
}

const STAR_LABELS = ["", "Veldig dårlig", "Dårlig", "OK", "Bra", "Utmerket"];

export default function RatingForm({ token, companyName }: RatingFormProps) {
  const { trackFunnel } = useAnalytics("customer_rating");
  const [score, setScore] = useState(0);
  const [hoverScore, setHoverScore] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const activeScore = hoverScore || score;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (score === 0) {
      setError("Velg antall stjerner");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, score, comment }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Noe gikk galt");
        return;
      }

      trackFunnel("rating_submitted");
      setSuccess(true);
    } catch {
      setError("Nettverksfeil — prøv igjen");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="mb-3 text-5xl">🎉</div>
        <h2 className="mb-2 text-lg font-bold text-[#1e3a5f]">Takk for din vurdering!</h2>
        <p className="text-gray-600">
          Du ga {companyName}{" "}
          <span className="font-semibold">{score} av 5</span> stjerner.
        </p>
        {score < 3 && (
          <p className="mt-2 text-sm text-gray-600">
            Vurderinger under 3 stjerner gjennomgås før publisering.
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Star picker */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className="text-4xl transition-transform hover:scale-110 focus:outline-none"
              onMouseEnter={() => setHoverScore(star)}
              onMouseLeave={() => setHoverScore(0)}
              onClick={() => setScore(star)}
              aria-label={`${star} stjerner`}
            >
              {star <= activeScore ? "⭐" : "☆"}
            </button>
          ))}
        </div>
        {activeScore > 0 && (
          <span className="text-sm font-medium text-gray-600">
            {STAR_LABELS[activeScore]}
          </span>
        )}
      </div>

      {/* Comment */}
      <div>
        <label htmlFor="comment" className="mb-1 block text-sm font-medium text-gray-700">
          Kommentar (valgfritt)
        </label>
        <textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={1000}
          rows={3}
          placeholder="Fortell om din opplevelse..."
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f] focus:outline-none"
        />
        <p className="mt-1 text-xs text-gray-600">{comment.length}/1000</p>
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <button
        type="submit"
        disabled={submitting || score === 0}
        className="w-full rounded-md bg-[#1e3a5f] px-4 py-3 font-semibold text-white transition-colors hover:bg-[#2a4f7f] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Sender..." : "Send vurdering"}
      </button>

      {score > 0 && score < 3 && (
        <p className="text-center text-xs text-gray-600">
          Vurderinger under 3 stjerner gjennomgås av admin før publisering.
        </p>
      )}
    </form>
  );
}

