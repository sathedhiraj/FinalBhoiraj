/** Format a number as Indian Rupee, e.g. 2000 -> "₹2,000" */
export function formatRupee(amount: number): string {
  const value = Number.isFinite(amount) ? amount : 0;
  return "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(value));
}

/** Format a number with thousands separators, no symbol. */
export function formatNumber(amount: number): string {
  const value = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(value));
}

/** Format a Date as "26 Aug 2026". */
export function formatDateShort(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

/** Format a Date as "26/08/2026". */
export function formatDateDMY(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

/** Format a Date as an ISO yyyy-mm-dd for <input type="date">. */
export function toDateInputValue(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const tz = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return tz.toISOString().slice(0, 10);
}

/** Build a receipt number like "GM-0001" with zero-padding to 4 digits. */
export function formatReceiptNumber(prefix: string, n: number): string {
  return `${prefix}${String(n).padStart(4, "0")}`;
}

/** Avoid duplicating the year when the festival name already ends with it. */
export function festivalLabel(name: string, year: number): string {
  const y = String(year);
  return name.endsWith(y) ? name : `${name} ${y}`;
}
