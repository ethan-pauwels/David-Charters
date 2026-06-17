import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabase } from "@/lib/supabaseClient";
import { getUtcDateFromYmd, isValidDateString } from "@/lib/utils";

type CheckoutBody = {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  marketingOptIn?: boolean;
  guestCount?: number;
  occasion?: string;
};

const allowedTimeSlots = [
  {
    start: "11:00:00",
    end: "15:00:00",
  },
  {
    start: "15:30:00",
    end: "19:30:00",
  },
];

function normalizeTime(time: string): string {
  return time.length === 5 ? `${time}:00` : time;
}

function isAllowedTimeSlot(startTime: string, endTime: string): boolean {
  return allowedTimeSlots.some(
    (slot) => slot.start === startTime && slot.end === endTime
  );
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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CheckoutBody;

    const customerName = body.customerName?.trim();
    const customerEmail = body.customerEmail?.trim();
    const customerPhone = body.customerPhone?.trim() ?? "";
    const bookingDate = body.bookingDate?.trim();
    const marketingOptIn = body.marketingOptIn === true;

    const guestCount = Number(body.guestCount);
    const occasion = body.occasion?.trim() ?? "";

    const startTime = normalizeTime(body.startTime?.trim() ?? "");
    const endTime = normalizeTime(body.endTime?.trim() ?? "");

    if (!customerName || !customerEmail || !bookingDate || !startTime || !endTime) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    if (!isValidDateString(bookingDate)) {
      return NextResponse.json(
        { error: "Invalid booking date." },
        { status: 400 }
      );
    }

    if (!isAllowedTimeSlot(startTime, endTime)) {
      return NextResponse.json(
        { error: "That is not a valid charter time slot." },
        { status: 400 }
      );
    }

    if (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > 12) {
      return NextResponse.json(
        { error: "Guest count must be between 1 and 12." },
        { status: 400 }
      );
    }

    const dayOfWeek = getUtcDateFromYmd(bookingDate).getUTCDay();

    const [
      settingsResult,
      availabilityResult,
      bookingsResult,
      blockedSlotResult,
      priceOverrideResult,
    ] = await Promise.all([
      supabase
        .from("business_settings")
        .select("price_cents, charter_name")
        .limit(1)
        .maybeSingle(),

      supabase
        .from("weekly_availability")
        .select("id")
        .eq("day_of_week", dayOfWeek)
        .eq("start_time", startTime)
        .eq("end_time", endTime)
        .eq("is_active", true)
        .maybeSingle(),

      supabase
        .from("bookings")
        .select("id")
        .eq("booking_date", bookingDate)
        .eq("start_time", startTime)
        .eq("end_time", endTime)
        .eq("status", "confirmed")
        .maybeSingle(),

      supabase
        .from("blocked_slots")
        .select("id, reason")
        .eq("booking_date", bookingDate)
        .eq("start_time", startTime)
        .eq("end_time", endTime)
        .limit(1)
        .maybeSingle(),

      supabase
        .from("date_price_overrides")
        .select("price_cents, start_time, end_time")
        .eq("booking_date", bookingDate),
    ]);

    console.log("Checkout debug:", {
      bookingDate,
      startTime,
      endTime,
      dayOfWeek,
      settingsError: settingsResult.error,
      availabilityError: availabilityResult.error,
      bookingsError: bookingsResult.error,
      blockedSlotError: blockedSlotResult.error,
      blockedSlotData: blockedSlotResult.data,
      priceOverrideError: priceOverrideResult.error,
      priceOverrideData: priceOverrideResult.data,
    });

    if (settingsResult.error) {
      console.error("Failed to load business settings:", settingsResult.error);
    }

    if (availabilityResult.error) {
      console.error("Availability validation failed:", availabilityResult.error);
      return NextResponse.json(
        { error: "Could not verify availability." },
        { status: 500 }
      );
    }

    if (!availabilityResult.data) {
      return NextResponse.json(
        { error: "That time slot is not available for this day." },
        { status: 400 }
      );
    }

    if (bookingsResult.error) {
      console.error("Booking conflict check failed:", bookingsResult.error);
      return NextResponse.json(
        { error: "Could not verify booking conflicts." },
        { status: 500 }
      );
    }

    if (bookingsResult.data) {
      return NextResponse.json(
        { error: "That time slot has already been booked." },
        { status: 409 }
      );
    }

    if (blockedSlotResult.error) {
      console.error("Blocked slot check failed:", blockedSlotResult.error);
      return NextResponse.json(
        { error: "Could not verify blocked slots." },
        { status: 500 }
      );
    }

    if (blockedSlotResult.data) {
      return NextResponse.json(
        {
          error:
            blockedSlotResult.data.reason ||
            "That time slot is unavailable. Please choose another slot.",
        },
        { status: 409 }
      );
    }

    if (priceOverrideResult.error) {
      console.error("Price override check failed:", priceOverrideResult.error);
      return NextResponse.json(
        { error: "Could not verify date-specific pricing." },
        { status: 500 }
      );
    }

    const priceOverride = priceOverrideResult.data?.find((override) => {
      return (
        normalizeTime(override.start_time) === startTime &&
        normalizeTime(override.end_time) === endTime
      );
    });

    console.log("All price overrides for date:", priceOverrideResult.data);
    console.log("Matched price override:", priceOverride);

    let priceCents = priceOverride?.price_cents ?? 70000;

    if (!priceOverride) {
      if (dayOfWeek === 6) {
        priceCents = 90000;
      } else if (dayOfWeek === 0) {
        priceCents = 80000;
      }
    }

    console.log("Final checkout price:", priceCents);

    const charterName = settingsResult.data?.charter_name ?? "David's Charters";
    const slotLabel = `${formatTimeTo12Hour(startTime)} - ${formatTimeTo12Hour(
      endTime
    )}`;

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    if (!baseUrl) {
      return NextResponse.json(
        { error: "Missing NEXT_PUBLIC_BASE_URL." },
        { status: 500 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${baseUrl}/booking/success`,
      cancel_url: `${baseUrl}/booking?canceled=1`,
      customer_email: customerEmail,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            product_data: {
              name: charterName,
              description: `${bookingDate} ${slotLabel}`,
            },
            unit_amount: priceCents,
          },
        },
      ],
      metadata: {
        customerName,
        customerEmail,
        customerPhone,
        bookingDate,
        startTime,
        endTime,
        slotLabel,
        guestCount: String(guestCount),
        occasion,
        priceCents: String(priceCents),
        charterName,
        marketingOptIn: marketingOptIn ? "true" : "false",
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout route failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create checkout session.",
      },
      { status: 500 }
    );
  }
}