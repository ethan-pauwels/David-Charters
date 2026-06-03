import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { updateCalendarEvent, deleteCalendarEvent } from "@/lib/googleCalendar";

function normalizeTime(time: string): string {
  return time.length === 5 ? `${time}:00` : time;
}

export async function GET() {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .order("booking_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const { id, updates } = body;

  if (!id || !updates) {
    return NextResponse.json(
      { error: "Missing id or updates." },
      { status: 400 }
    );
  }

  const isReschedule =
    updates.booking_date || updates.start_time || updates.end_time;

  const { data: existingBooking, error: existingBookingError } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", id)
    .single();

  if (existingBookingError || !existingBooking) {
    return NextResponse.json(
      { error: existingBookingError?.message || "Booking not found." },
      { status: 500 }
    );
  }

  const nextBookingDate = updates.booking_date ?? existingBooking.booking_date;

  const nextStartTime = normalizeTime(
    updates.start_time ?? existingBooking.start_time
  );

  const nextEndTime = normalizeTime(
    updates.end_time ?? existingBooking.end_time
  );

  if (isReschedule) {
    const { data: conflictingBooking, error: conflictError } = await supabase
      .from("bookings")
      .select("id")
      .eq("booking_date", nextBookingDate)
      .eq("start_time", nextStartTime)
      .eq("end_time", nextEndTime)
      .eq("status", "confirmed")
      .neq("id", id)
      .maybeSingle();

    if (conflictError) {
      return NextResponse.json(
        {
          error: `Could not check booking conflicts: ${conflictError.message}`,
        },
        { status: 500 }
      );
    }

    if (conflictingBooking) {
      return NextResponse.json(
        { error: "That date and time slot is already booked." },
        { status: 400 }
      );
    }
  }

  const cleanUpdates = {
    ...updates,
    ...(updates.start_time
      ? { start_time: normalizeTime(updates.start_time) }
      : {}),
    ...(updates.end_time ? { end_time: normalizeTime(updates.end_time) } : {}),
  };

  const { data, error } = await supabase
    .from("bookings")
    .update(cleanUpdates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (isReschedule && existingBooking.google_event_id) {
    const calendarUpdated = await updateCalendarEvent({
      eventId: existingBooking.google_event_id,
      customerName: data.customer_name,
      customerEmail: data.customer_email,
      customerPhone: data.customer_phone,
      bookingDate: data.booking_date,
      startTime: data.start_time,
      endTime: data.end_time,
      charterName: "David Charters",
      guestCount: data.guest_count ?? 1,
      occasion: data.occasion ?? null,
    });

    if (!calendarUpdated) {
      return NextResponse.json(
        {
          ...data,
          warning:
            "Booking was updated, but the Google Calendar event could not be updated.",
        },
        { status: 200 }
      );
    }
  }

  if (isReschedule && !existingBooking.google_event_id) {
    return NextResponse.json(
      {
        ...data,
        warning:
          "Booking was updated, but no Google Calendar event ID was saved for this booking. The calendar event may need to be updated manually.",
      },
      { status: 200 }
    );
  }

  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }

  const { data: booking, error: bookingLookupError } = await supabase
    .from("bookings")
    .select(
      "id, customer_name, booking_date, start_time, end_time, google_event_id"
    )
    .eq("id", id)
    .single();

  if (bookingLookupError || !booking) {
    return NextResponse.json(
      { error: bookingLookupError?.message || "Booking not found." },
      { status: 500 }
    );
  }

  console.log("Deleting booking:", booking);
  console.log("Google Calendar event ID to delete:", booking.google_event_id);

  let calendarDeleted = false;

  if (booking.google_event_id) {
    calendarDeleted = await deleteCalendarEvent(booking.google_event_id);
    console.log("Google Calendar delete result:", calendarDeleted);
  } else {
    console.warn("No google_event_id saved for this booking.");
  }

  const { error } = await supabase.from("bookings").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!booking.google_event_id) {
    return NextResponse.json({
      success: true,
      warning:
        "Booking was deleted, but no Google Calendar event ID was saved for this booking. Delete the calendar event manually.",
    });
  }

  if (!calendarDeleted) {
    return NextResponse.json({
      success: true,
      warning:
        "Booking was deleted, but the Google Calendar event could not be deleted. Check your terminal logs for the Google Calendar error.",
    });
  }

  return NextResponse.json({
    success: true,
    message: "Booking and Google Calendar event deleted successfully.",
  });
}