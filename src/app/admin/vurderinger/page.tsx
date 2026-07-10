"use client";

import { RatingReview } from "@/components/admin/rating-review";

export default function AdminVurderingerPage() {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-[#1e3a5f]">Vurderinger</h1>
      <RatingReview />
    </div>
  );
}

