import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { getDayName, getUtcDateFromYmd, isValidDateString } from "@/lib/utils";

type SlotRow = {
  start_time: string;
  end_time: string;
  is_active: boolean;
};

type TimeRangeRow = {
  start_time: string;
  end_time: string;
};

type BlockedSlotRow = {
  start_time: string;
  end_time: string;
  reason: string | null;
};

type PriceOverrideRow = {
  start_time: string;
  end_time: string;
  price_cents: number;
  note: string | null;
};

function normalizeTime(time: string): string {
  return time.length === 5 ? `${time}:00` : time;
}

function formatTimeTo12Hour(time: string): string {
  const normalized = normalizeTime(time);
  const [hourString, minuteString] = normalized.split(":");
  const hour = Number(hourString);
  const minute = Number(minuteString);

  const suffix = hour >= 12 ? "PM" : "AM";
  const adjustedHour = hour % 12 === 0 ? 12 : hour % 12;

  return `${adjustedHour}:${minute.toString().padStart(2, "0")} ${suffix}`;
}

function makeSlotKey(startTime: string, endTime: string): string {
  return `${normalizeTime(startTime)}|${normalizeTime(endTime)}`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    if (!date || !isValidDateString(date)) {
      return NextResponse.json(
        { error: "A valid date query parameter is required." },
        { status: 400 }
      );
    }

    const dayOfWeek = getUtcDateFromYmd(date).getUTCDay();

    const [
      availabilityResult,
      bookingsResult,
      blockedSlotsResult,
      settingsResult,
      priceOverrideResult,
    ] = await Promise.all([
      supabase
        .from("weekly_availability")
        .select("start_time, end_time, is_active")
        .eq("day_of_week", dayOfWeek)
        .eq("is_active", true)
        .order("start_time", { ascending: true }),

      supabase
        .from("bookings")
        .select("start_time, end_time")
        .eq("booking_date", date)
        .eq("status", "confirmed"),

      supabase
        .from("blocked_slots")
        .select("start_time, end_time, reason")
        .eq("booking_date", date),

      supabase
        .from("business_settings")
        .select("price_cents, charter_name, timezone")
        .limit(1)
        .maybeSingle(),

      supabase
        .from("date_price_overrides")
        .select("start_time, end_time, price_cents, note")
        .eq("booking_date", date),
    ]);

    if (availabilityResult.error) {
      return NextResponse.json(
        { error: availabilityResult.error.message },
        { status: 500 }
      );
    }

    if (bookingsResult.error) {
      return NextResponse.json(
        { error: bookingsResult.error.message },
        { status: 500 }
      );
    }

    if (blockedSlotsResult.error) {
      return NextResponse.json(
        { error: blockedSlotsResult.error.message },
        { status: 500 }
      );
    }

    if (priceOverrideResult.error) {
      return NextResponse.json(
        { error: priceOverrideResult.error.message },
        { status: 500 }
      );
    }

    let fallbackPriceCents = 70000;

    if (dayOfWeek === 6) {
      fallbackPriceCents = 90000;
    } else if (dayOfWeek === 0) {
      fallbackPriceCents = 80000;
    }

    const booked: TimeRangeRow[] = bookingsResult.data ?? [];

    const taken = new Set(
      booked.map((item) => makeSlotKey(item.start_time, item.end_time))
    );

    const blockedSlots: BlockedSlotRow[] = blockedSlotsResult.data ?? [];

    const blockedMap = new Map(
      blockedSlots.map((item) => [
        makeSlotKey(item.start_time, item.end_time),
        item.reason,
      ])
    );

    const priceOverrides: PriceOverrideRow[] = priceOverrideResult.data ?? [];

    const overrideMap = new Map(
      priceOverrides.map((override) => [
        makeSlotKey(override.start_time, override.end_time),
        override,
      ])
    );

    const slots = (availabilityResult.data ?? []).map((slot: SlotRow) => {
      const start = normalizeTime(slot.start_time);
      const end = normalizeTime(slot.end_time);
      const key = makeSlotKey(start, end);

      const override = overrideMap.get(key);
      const isBooked = taken.has(key);
      const isBlocked = blockedMap.has(key);
      const blockedReason = blockedMap.get(key) ?? null;

      const unavailableReason = isBlocked
        ? blockedReason || "This time slot is unavailable."
        : isBooked
          ? "This time slot has already been booked."
          : null;

      return {
        start,
        end,
        label: `${formatTimeTo12Hour(start)} - ${formatTimeTo12Hour(end)}`,

        available: !isBooked && !isBlocked,
        is_available: !isBooked && !isBlocked,

        booked: isBooked,
        is_booked: isBooked,

        blocked: isBlocked,
        is_blocked: isBlocked,

        reason: unavailableReason,
        blocked_reason: isBlocked ? unavailableReason : null,
        blocked_note: isBlocked ? unavailableReason : null,
        unavailable_reason: unavailableReason,

        price_cents: override?.price_cents ?? fallbackPriceCents,
        price_note: override?.note ?? null,
      };
    });

    const defaultSettings = {
      charter_name: settingsResult.data?.charter_name ?? "David's Charters",
      timezone: settingsResult.data?.timezone ?? "America/Chicago",
      price_cents: fallbackPriceCents,
    };

    return NextResponse.json({
      date,
      dayName: getDayName(date),
      allowedBookingDay: slots.length > 0,
      slots,
      settings: defaultSettings,
    });
  } catch (error) {
    console.error("Availability route failed:", error);

    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 }
    );
  }
}