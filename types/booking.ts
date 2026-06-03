export type Slot = {
  start: string;
  end: string;
  label: string;
};

export type AvailabilitySlot = Slot & {
  available: boolean;
  price_cents?: number;
  price_note?: string | null;
};

export type BookingStatus = "pending" | "confirmed" | "cancelled";

export type BusinessSettings = {
  price_cents: number;
  charter_name: string;
  timezone: string;
};

export type AvailabilityResponse = {
  date: string;
  dayName: string;
  allowedBookingDay: boolean;
  slots: AvailabilitySlot[];
  settings: BusinessSettings | null;
};