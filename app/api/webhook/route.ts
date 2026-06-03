import { NextResponse } from "next/server";
import Stripe from "stripe";
import { sendCustomerEmail, sendAdminEmail } from "@/lib/email";
import { stripe } from "@/lib/stripe";
import { supabase } from "@/lib/supabaseClient";
import { DEFAULT_PRICE_CENTS } from "@/lib/utils";
import { createCalendarEvent } from "@/lib/googleCalendar";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  console.log("Webhook received");

  if (!signature || !webhookSecret) {
    console.error("Missing signature or webhook secret");
    return NextResponse.json(
      { error: "Missing Stripe webhook configuration." },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    const body = await request.text();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    console.log("Webhook signature verified");
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return NextResponse.json(
      { error: "Invalid webhook signature." },
      { status: 400 }
    );
  }

  try {
    console.log("Webhook event type:", event.type);

    if (event.type !== "checkout.session.completed") {
      return NextResponse.json({ received: true });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata;

    console.log("Stripe session ID:", session.id);
    console.log("Metadata:", metadata);

    if (
      !metadata ||
      !metadata.customerName ||
      !metadata.customerEmail ||
      !metadata.bookingDate ||
      !metadata.startTime ||
      !metadata.endTime ||
      !metadata.guestCount
    ) {
      console.error("Missing required checkout metadata:", metadata);
      return NextResponse.json(
        { error: "Missing required checkout metadata." },
        { status: 400 }
      );
    }

    const guestCount = Number(metadata.guestCount);
    const occasion = metadata.occasion?.trim() || null;

    if (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > 12) {
      console.error("Invalid guest count:", metadata.guestCount);
      return NextResponse.json(
        { error: "Invalid guest count." },
        { status: 400 }
      );
    }

    const { data: existingBooking, error: existingLookupError } = await supabase
      .from("bookings")
      .select("id")
      .eq("stripe_checkout_session_id", session.id)
      .maybeSingle();

    if (existingLookupError) {
      console.error("Existing booking lookup failed:", existingLookupError);
      return NextResponse.json(
        { error: "Could not verify existing booking." },
        { status: 500 }
      );
    }

    if (existingBooking) {
      console.log("Duplicate webhook delivery ignored");
      return NextResponse.json({ received: true, duplicate: true });
    }

    const charterName = metadata.charterName || "David Charters";

    const { data: customer, error: customerUpsertError } = await supabase
      .from("customers")
      .upsert(
        {
          name: metadata.customerName,
          email: metadata.customerEmail,
          phone: metadata.customerPhone || null,
          marketing_opt_in: metadata.marketingOptIn === "true",
          last_booking_date: metadata.bookingDate,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "email",
        }
      )
      .select("id")
      .single();

    if (customerUpsertError || !customer) {
      console.error("Customer upsert failed:", customerUpsertError);
      return NextResponse.json(
        { error: "Failed to save customer." },
        { status: 500 }
      );
    }

    console.log("Customer saved successfully:", customer.id);

    let calendarEventId: string | null = null;

    try {
      console.log("Creating Google Calendar event...");

      calendarEventId = await createCalendarEvent({
        customerName: metadata.customerName,
        customerEmail: metadata.customerEmail,
        customerPhone: metadata.customerPhone || null,
        bookingDate: metadata.bookingDate,
        startTime: metadata.startTime,
        endTime: metadata.endTime,
        charterName,
        guestCount,
        occasion,
      });

      console.log("Calendar event created:", calendarEventId);
    } catch (calendarError) {
      console.error("Google Calendar event creation failed:", calendarError);
      calendarEventId = null;
    }

    const priceCents = metadata.priceCents
      ? Number(metadata.priceCents)
      : DEFAULT_PRICE_CENTS;

    const { error: insertError } = await supabase.from("bookings").insert({
      customer_id: customer.id,
      customer_name: metadata.customerName,
      customer_email: metadata.customerEmail,
      customer_phone: metadata.customerPhone || null,
      guest_count: guestCount,
      occasion,
      booking_date: metadata.bookingDate,
      start_time: metadata.startTime,
      end_time: metadata.endTime,
      price_cents: Number.isFinite(priceCents)
        ? priceCents
        : DEFAULT_PRICE_CENTS,
      status: "confirmed",
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : null,
      google_event_id: calendarEventId,
    });

    if (insertError) {
      console.error("Booking insert failed:", insertError);
      return NextResponse.json(
        { error: "Failed to save booking." },
        { status: 500 }
      );
    }

    console.log("Booking inserted successfully");

    const { count, error: countError } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("customer_id", customer.id);

    if (countError) {
      console.error("Customer booking count update failed:", countError);
    } else {
      const { error: updateCustomerError } = await supabase
        .from("customers")
        .update({
          total_bookings: count || 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", customer.id);

      if (updateCustomerError) {
        console.error(
          "Customer total_bookings update failed:",
          updateCustomerError
        );
      } else {
        console.log("Customer total_bookings updated:", count || 0);
      }
    }

    try {
      console.log("Sending customer confirmation email...");

      await sendCustomerEmail({
        to: metadata.customerEmail,
        name: metadata.customerName,
        date: metadata.bookingDate,
        startTime: metadata.startTime,
        endTime: metadata.endTime,
        charterName,
      });

      console.log("Customer confirmation email sent.");

      console.log("Sending admin notification email...");

      await sendAdminEmail({
        name: metadata.customerName,
        email: metadata.customerEmail,
        date: metadata.bookingDate,
        startTime: metadata.startTime,
        endTime: metadata.endTime,
        charterName,
      });

      console.log("Admin notification email sent.");
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler failed:", error);
    return NextResponse.json(
      { error: "Webhook handler failed." },
      { status: 500 }
    );
  }
}