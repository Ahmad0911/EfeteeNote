import * as XLSX from "xlsx";
import type { Apartment, Booking } from "./types";
import { STATUS_LABEL } from "./types";
import { addDays, parse, today } from "./dates";
import { aptName, related, isLive } from "./logic";

const d = (s: string) => parse(s);
const serial = (s: string) => Math.round((Date.UTC(d(s).getFullYear(), d(s).getMonth(), d(s).getDate()) - Date.UTC(1899, 11, 30)) / 86400000);

/** One simple workbook: Bookings, Availability (next 31 days), Summary, Apartments. */
export function downloadExcel(apts: Apartment[], bookings: Booking[]) {
  const wb = XLSX.utils.book_new();
  const rows = [...bookings].sort((a, b) => (a.check_in < b.check_in ? -1 : 1));

  // ---- Bookings
  const head = ["No.", "Guest", "Phone", "Apartment", "Check-in", "Check-out", "Nights", "Amount (₦)", "Paid (₦)", "Balance (₦)", "Status", "Note", "Last updated by"];
  const ws = XLSX.utils.aoa_to_sheet([head]);
  rows.forEach((b, i) => {
    const r = i + 2;
    XLSX.utils.sheet_add_aoa(ws, [[i + 1, b.guest, b.phone, aptName(apts, b.apartment_id), null, null, null, b.amount, b.paid, null, STATUS_LABEL[b.status], b.note, b.updated_by || ""]], { origin: `A${r}` });
    ws[`E${r}`] = { t: "n", v: serial(b.check_in), z: "dd-mmm-yyyy" };
    ws[`F${r}`] = { t: "n", v: serial(b.check_out), z: "dd-mmm-yyyy" };
    ws[`G${r}`] = { t: "n", f: `F${r}-E${r}`, v: serial(b.check_out) - serial(b.check_in) };
    ws[`J${r}`] = { t: "n", f: `H${r}-I${r}`, v: b.amount - b.paid };
    for (const c of ["H", "I", "J"]) ws[`${c}${r}`].z = "#,##0";
  });
  const last = Math.max(rows.length + 1, 2);
  ws["!ref"] = `A1:M${last}`;
  ws["!cols"] = [5, 24, 15, 28, 13, 13, 8, 14, 14, 14, 13, 30, 24].map((wch) => ({ wch }));
  ws["!autofilter"] = { ref: `A1:M${last}` };
  ws["!freeze"] = { xSplit: 0, ySplit: 1 } as never;
  XLSX.utils.book_append_sheet(wb, ws, "Bookings");

  // ---- Availability: next 31 days, guest name in each occupied night
  const start = today();
  const days = Array.from({ length: 31 }, (_, i) => addDays(start, i));
  const grid: (string | number)[][] = [["Apartment", ...days.map((x) => serial(x))]];
  for (const a of apts.filter((x) => x.active)) {
    const rel = related(apts, a.id);
    grid.push([a.name, ...days.map((day) => {
      const b = bookings.find((k) => isLive(k) && rel.includes(k.apartment_id) && k.check_in <= day && k.check_out > day);
      return b ? b.guest : "";
    })]);
  }
  const wa = XLSX.utils.aoa_to_sheet(grid);
  days.forEach((_, i) => { const ref = XLSX.utils.encode_cell({ r: 0, c: i + 1 }); wa[ref].z = "ddd dd-mmm"; });
  wa["!cols"] = [{ wch: 30 }, ...days.map(() => ({ wch: 13 }))];
  XLSX.utils.book_append_sheet(wb, wa, "Availability");

  // ---- Summary (formulas read the Bookings sheet, so it always matches)
  const sum = XLSX.utils.aoa_to_sheet([
    ["Efetee Apartments - Summary"],
    ["Downloaded", new Date().toLocaleString("en-GB", { timeZone: "Africa/Lagos" })],
    [],
    ["Number of bookings (not cancelled)"],
    ["Total booked (₦)"],
    ["Total paid (₦)"],
    ["Balance still owed (₦)"],
  ]);
  const live = rows.filter(isLive);
  const f = (cell: string, formula: string, v: number, z?: string) => { sum[cell] = { t: "n", f: formula, v, ...(z ? { z } : {}) }; };
  f("B4", `COUNTIF(Bookings!K2:K2000,"<>Cancelled")-COUNTBLANK(Bookings!K2:K2000)`, live.length);
  f("B5", `SUMIF(Bookings!K2:K2000,"<>Cancelled",Bookings!H2:H2000)`, live.reduce((s, b) => s + b.amount, 0), "#,##0");
  f("B6", `SUMIF(Bookings!K2:K2000,"<>Cancelled",Bookings!I2:I2000)`, live.reduce((s, b) => s + b.paid, 0), "#,##0");
  f("B7", "B5-B6", live.reduce((s, b) => s + b.amount - b.paid, 0), "#,##0");
  sum["!ref"] = "A1:B7";
  sum["!cols"] = [{ wch: 36 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, sum, "Summary");

  // ---- Apartments
  const wp = XLSX.utils.aoa_to_sheet([["Apartment", "Rate per night (₦)", "In use"], ...apts.map((a) => [a.name, a.rate, a.active ? "Yes" : "No"])]);
  wp["!cols"] = [{ wch: 32 }, { wch: 18 }, { wch: 8 }];
  XLSX.utils.book_append_sheet(wb, wp, "Apartments");

  XLSX.writeFile(wb, `Efetee-Bookings-${start}.xlsx`, { cellDates: false });
}
