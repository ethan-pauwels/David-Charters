import type {
  AvailabilityResponse,
  AvailabilitySlot,
  Slot,
} from "@/types/booking";

export const DEFAULT_PRICE_CENTS = 20000;
export const DEFAULT_BOAT_NAME = "David's Charter";

export const FIXED_SLOTS: Slot[] = [
  { start: "12:00:00", end: "14:00:00", label: "12:00 PM - 2:00 PM" },
  { start: "14:00:00", end: "16:00:00", label: "2:00 PM - 4:00 PM" },
  { start: "16:00:00", end: "18:00:00", label: "4:00 PM - 6:00 PM" },
];

const ALLOWED_DAYS = new Set([5, 6, 0]); // Friday, Saturday, Sunday

export function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime());
}

export function getUtcDateFromYmd(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

export function getDayName(date: string): string {
  return getUtcDateFromYmd(date).toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "UTC",
  });
}

export function isAllowedBookingDay(date: string): boolean {
  const day = getUtcDateFromYmd(date).getUTCDay();
  return ALLOWED_DAYS.has(day);
}

export function isValidSlot(start: string, end: string): boolean {
  return FIXED_SLOTS.some((slot) => slot.start === start && slot.end === end);
}

export function getSlotLabel(start: string, end: string): string {
  return (
    FIXED_SLOTS.find((slot) => slot.start === start && slot.end === end)?.label ??
    `${start} - ${end}`
  );
}

export function buildAvailability(
  date: string,
  booked: Array<{ start_time: string; end_time: string }>,
  blocked: Array<{ start_time: string; end_time: string }>
): AvailabilityResponse {
  const allowedBookingDay = isAllowedBookingDay(date);
  const dayName = getDayName(date);

  const taken = new Set(
    [...booked, ...blocked].map((item) => `${item.start_time}|${item.end_time}`)
  );

  const slots: AvailabilitySlot[] = FIXED_SLOTS.map((slot) => ({
    ...slot,
    available: allowedBookingDay && !taken.has(`${slot.start}|${slot.end}`),
  }));

  return {
    date,
    dayName,
    allowedBookingDay,
    slots,
    settings: null,
  };
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function normalizePhone(value: string): string {
  return value.trim();
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeName(value: string): string {
  return value.trim();
}

export function getBaseUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim();

  if (!baseUrl) {
    throw new Error("Missing NEXT_PUBLIC_BASE_URL.");
  }

  return baseUrl.replace(/\/$/, "");
}