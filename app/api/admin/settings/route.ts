import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET() {
  const [settingsResult, availabilityResult] = await Promise.all([
    supabase.from("business_settings").select("*").limit(1).single(),
    supabase
      .from("weekly_availability")
      .select("*")
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true }),
  ]);

  if (settingsResult.error) {
    return NextResponse.json({ error: settingsResult.error.message }, { status: 500 });
  }

  if (availabilityResult.error) {
    return NextResponse.json({ error: availabilityResult.error.message }, { status: 500 });
  }

  return NextResponse.json({
    settings: settingsResult.data,
    weeklyAvailability: availabilityResult.data,
  });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const { settingsId, charter_name, price_cents, timezone } = body;

  const { data, error } = await supabase
    .from("business_settings")
    .update({ charter_name, price_cents, timezone })
    .eq("id", settingsId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { day_of_week, start_time, end_time, is_active } = body;

  const { data, error } = await supabase
    .from("weekly_availability")
    .insert({ day_of_week, start_time, end_time, is_active })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  const { error } = await supabase
    .from("weekly_availability")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}