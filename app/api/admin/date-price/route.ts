import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(request: Request) {
  const body = await request.json();

  const { booking_date, start_time, end_time, price_cents, note } = body;

  if (!booking_date || !start_time || !end_time || !price_cents) {
    return NextResponse.json(
      { error: "Missing fields." },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("date_price_overrides")
    .upsert(
      {
        booking_date,
        start_time,
        end_time,
        price_cents,
        note,
      },
      {
        onConflict: "booking_date,start_time,end_time",
      }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}