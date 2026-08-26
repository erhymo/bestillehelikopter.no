/** "2026-08-31" -> "31. august 2026" */
export function formatDateNorwegian(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("nb-NO", { day: "numeric", month: "long", year: "numeric" });
}
