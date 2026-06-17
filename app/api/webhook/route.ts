import { NextResponse } from "next/server";
import Stripe from "stripe";
import { sendCustomerEmail, sendAdminEmail } from "@/lib/email";
import { stripe } from "@/lib/stripe";
import { supabase } from "@/lib/supabaseClient";
import { DEFAULT_PRICE_CENTS } from "@/lib/utils";
import { createCalendarEvent } from "@/lib/googleCalendar";

export const runtime = "nodejs";

export async function POST(request: Request) {
  console.log("1. Webhook received");

  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

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
    console.log("2. Webhook signature verified");
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return NextResponse.json(
      { error: "Invalid webhook signature." },
      { status: 400 }
    );
  }

  try {
    console.log("3. Webhook event type:", event.type);

    if (event.type !== "checkout.session.completed") {
      console.log("Ignoring non-checkout event:", event.type);
      return NextResponse.json({ received: true });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata || {};

    console.log("4. Stripe session ID:", session.id);
    console.log("5. Metadata:", metadata);

    const customerName = metadata.customerName?.trim();
    const customerEmail =
      metadata.customerEmail?.trim() || session.customer_details?.email || null;
    const customerPhone =
      metadata.customerPhone?.trim() || session.customer_details?.phone || null;

    const bookingDate = metadata.bookingDate?.trim();
    const startTime = metadata.startTime?.trim();
    const endTime = metadata.endTime?.trim();

    const guestCount = Number(metadata.guestCount);
    const occasion = metadata.occasion?.trim() || null;
    const charterName = metadata.charterName?.trim() || "David Charters";
    const marketingOptIn = metadata.marketingOptIn === "true";

    if (
      !customerName ||
      !customerEmail ||
      !bookingDate ||
      !startTime ||
      !endTime ||
      !metadata.guestCount
    ) {
      console.error("Missing required checkout metadata:", {
        customerName,
        customerEmail,
        bookingDate,
        startTime,
        endTime,
        guestCount: metadata.guestCount,
        fullMetadata: metadata,
      });

      return NextResponse.json(
        { error: "Missing required checkout metadata." },
        { status: 400 }
      );
    }

    if (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > 12) {
      console.error("Invalid guest count:", metadata.guestCount);
      return NextResponse.json(
        { error: "Invalid guest count." },
        { status: 400 }
      );
    }

    console.log("6. Checking for existing booking...");

    const { data: existingBooking, error: existingLookupError } = await supabase
      .from("bookings")
      .select("id, google_event_id")
      .eq("stripe_checkout_session_id", session.id)
      .maybeSingle();

    if (existingLookupError) {
      console.error("Existing booking lookup failed:", existingLookupError);
      return NextResponse.json(
        { error: "Could not verify existing booking." },
        { status: 500 }
      );
    }

    // Important:
    // Do not fully stop here if Google Calendar failed on the first webhook attempt.
    // This lets a retried webhook repair a missing calendar event.
    if (existingBooking) {
      console.log("7. Existing booking found:", existingBooking.id);

      if (!existingBooking.google_event_id) {
        try {
          console.log("8. Existing booking has no Google event. Creating one...");

          const calendarEventId = await createCalendarEvent({
            customerName,
            customerEmail,
            customerPhone,
            bookingDate,
            startTime,
            endTime,
            charterName,
            guestCount,
            occasion,
          });

          console.log("9. Calendar event result for existing booking:", calendarEventId);

          if (calendarEventId) {
            const { error: calendarUpdateError } = await supabase
              .from("bookings")
              .update({ google_event_id: calendarEventId })
              .eq("id", existingBooking.id);

            if (calendarUpdateError) {
              console.error(
                "Failed to save Google event ID on existing booking:",
                calendarUpdateError
              );
            } else {
              console.log("10. Google event ID saved on existing booking.");
            }
          }
        } catch (calendarError) {
          console.error(
            "Google Calendar repair failed for existing booking:",
            calendarError
          );
        }
      } else {
        console.log(
          "Existing booking already has Google event:",
          existingBooking.google_event_id
        );
      }

      return NextResponse.json({
        received: true,
        duplicate: true,
        repairedCalendarIfMissing: true,
      });
    }

    console.log("11. Saving customer...");

    const { data: customer, error: customerUpsertError } = await supabase
      .from("customers")
      .upsert(
        {
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
          marketing_opt_in: marketingOptIn,
          last_booking_date: bookingDate,
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

    console.log("12. Customer saved successfully:", customer.id);

    const priceCents = metadata.priceCents
      ? Number(metadata.priceCents)
      : DEFAULT_PRICE_CENTS;

    console.log("13. Inserting booking...");

    const { data: booking, error: insertError } = await supabase
      .from("bookings")
      .insert({
        customer_id: customer.id,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        guest_count: guestCount,
        occasion,
        booking_date: bookingDate,
        start_time: startTime,
        end_time: endTime,
        price_cents: Number.isFinite(priceCents)
          ? priceCents
          : DEFAULT_PRICE_CENTS,
        status: "confirmed",
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : null,
        google_event_id: null,
      })
      .select("id")
      .single();

    if (insertError || !booking) {
      console.error("Booking insert failed:", insertError);
      return NextResponse.json(
        { error: "Failed to save booking." },
        { status: 500 }
      );
    }

    console.log("14. Booking inserted successfully:", booking.id);

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
        console.log("15. Customer total_bookings updated:", count || 0);
      }
    }

    const calendarPromise = async () => {
      try {
        console.log("16. Creating Google Calendar event...");

        const calendarEventId = await createCalendarEvent({
          customerName,
          customerEmail,
          customerPhone,
          bookingDate,
          startTime,
          endTime,
          charterName,
          guestCount,
          occasion,
        });

        console.log("17. Calendar event result:", calendarEventId);

        if (calendarEventId) {
          const { error: updateBookingError } = await supabase
            .from("bookings")
            .update({ google_event_id: calendarEventId })
            .eq("id", booking.id);

          if (updateBookingError) {
            console.error(
              "Failed to save Google event ID on booking:",
              updateBookingError
            );
          } else {
            console.log("18. Google event ID saved on booking.");
          }
        }
      } catch (calendarError) {
        console.error("Google Calendar event creation failed:", calendarError);
      }
    };

    const emailPromise = async () => {
      try {
        console.log("19. Sending customer confirmation email...");

        await sendCustomerEmail({
          to: customerEmail,
          name: customerName,
          date: bookingDate,
          startTime,
          endTime,
          charterName,
        });

        console.log("20. Customer confirmation email sent.");

        console.log("21. Sending admin notification email...");

        await sendAdminEmail({
          name: customerName,
          email: customerEmail,
          date: bookingDate,
          startTime,
          endTime,
          charterName,
        });

        console.log("22. Admin notification email sent.");
      } catch (emailError) {
        console.error("Email sending failed:", emailError);
      }
    };

    await Promise.allSettled([calendarPromise(), emailPromise()]);

    console.log("23. Webhook finished successfully");

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler failed:", error);
    return NextResponse.json(
      { error: "Webhook handler failed." },
      { status: 500 }
    );
  }
}