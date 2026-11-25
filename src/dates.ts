const p2 = (n: number) => String(n).padStart(2, "0");
export const toISO = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
export const parse = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
export const addDays = (s: string, n: number) => { const d = parse(s); d.setDate(d.getDate() + n); return toISO(d); };
export const nights = (a: string, b: string) => (a && b ? Math.round((parse(b).getTime() - parse(a).getTime()) / 86400000) : 0);
/** Today in Nigerian time, whatever the computer's own clock zone. */
export const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(new Date());
export const fmt = (s: string) => parse(s).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
export const fmtLong = (s: string) => parse(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
export const naira = (n: number) => "₦" + Math.round(n).toLocaleString("en-NG");
