import type { Apartment, Booking } from "./types";

/** cancelled bookings never block anything */
export const isLive = (b: Booking) => b.status !== "cancelled";

/** apartments that share space with this one: itself, its whole flat, or bedrooms inside it */
export const related = (apts: Apartment[], id: string) => {
  const me = apts.find((a) => a.id === id);
  return apts.filter((a) => a.id === id || a.id === me?.parent_id || a.parent_id === id).map((a) => a.id);
};

/** the booking that stops `aptId` being used on nights [ci, co), if any */
export function clash(apts: Apartment[], bookings: Booking[], aptId: string, ci: string, co: string, ignoreId?: string) {
  if (!aptId || !ci || !co || co <= ci) return undefined;
  const rel = related(apts, aptId);
  return bookings.find((b) => isLive(b) && b.id !== ignoreId && rel.includes(b.apartment_id) && b.check_in < co && b.check_out > ci);
}

export const aptName = (apts: Apartment[], id: string) => apts.find((a) => a.id === id)?.name ?? "(removed)";
export const balance = (b: Booking) => (isLive(b) ? b.amount - b.paid : 0);
