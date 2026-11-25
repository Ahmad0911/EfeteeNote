export type Status = "booked" | "in" | "out" | "cancelled";

export type Apartment = { id: string; name: string; rate: number; parent_id: string | null; sort: number; active: boolean };

export type Booking = {
  id: string; guest: string; phone: string; apartment_id: string;
  check_in: string; check_out: string; amount: number; paid: number;
  status: Status; note: string; updated_by?: string | null; updated_at?: string | null;
};

export const STATUS_LABEL: Record<Status, string> = { booked: "Booked", in: "Checked in", out: "Checked out", cancelled: "Cancelled" };
