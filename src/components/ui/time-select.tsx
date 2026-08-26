"use client";

// Two plain <select> dropdowns instead of a native <input type="time">.
// Native time inputs are segmented widgets that have repeatedly drifted out
// of sync with what they visually display across browsers (see git history
// on the register/RFQ forms) — a <select> has no such ambiguity: its value
// is always exactly what's shown, in every browser, every time.

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

export function splitTimeString(time: string | null | undefined): { hour: string; minute: string } {
  if (!time) return { hour: "", minute: "" };
  const [hour, minute] = time.split(":");
  return { hour: hour ?? "", minute: minute ?? "" };
}

interface TimeSelectProps {
  hour: string;
  minute: string;
  onHourChange: (v: string) => void;
  onMinuteChange: (v: string) => void;
  className?: string;
}

export function TimeSelect({ hour, minute, onHourChange, onMinuteChange, className = "" }: TimeSelectProps) {
  const selectClass =
    "w-full rounded-lg border px-2 py-2.5 text-sm focus:border-brand-700 focus:outline-none focus:ring-1 focus:ring-brand-700";

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <select value={hour} onChange={(e) => onHourChange(e.target.value)} className={selectClass}>
        <option value="">Time</option>
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <span className="text-gray-500">:</span>
      <select value={minute} onChange={(e) => onMinuteChange(e.target.value)} className={selectClass}>
        <option value="">Min</option>
        {MINUTES.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </div>
  );
}
