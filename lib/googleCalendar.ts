import { google } from "googleapis";
import { supabase } from "@/lib/supabaseClient";

type CreateCalendarEventInput = {
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  bookingDate: string;
  startTime: string;
  endTime: string;
  charterName?: string | null;
  guestCount: number;
  occasion?: string | null;
};

type UpdateCalendarEventInput = {
  eventId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  bookingDate: string;
  startTime: string;
  endTime: string;
  charterName?: string | null;
  guestCount: number;
  occasion?: string | null;
};

function buildIsoDateTime(date: string, time: string): string {
  return `${date}T${time}`;
}

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

function getFormattedPrivateKey(): string | null {
  const rawPrivateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!rawPrivateKey) {
    console.error("Missing GOOGLE_PRIVATE_KEY env var.");
    return null;
  }

  let privateKey = rawPrivateKey.trim();

  // If the whole service account JSON was pasted into GOOGLE_PRIVATE_KEY,
  // pull out the private_key field.
  if (privateKey.startsWith("{")) {
    try {
      const parsed = JSON.parse(privateKey) as { private_key?: string };

      if (!parsed.private_key) {
        console.error("Service account JSON does not contain private_key.");
        return null;
      }

      privateKey = parsed.private_key;
    } catch {
      console.error("GOOGLE_PRIVATE_KEY looks like JSON but could not be parsed.");
      return null;
    }
  }

  // Handles wrapping quotes from Vercel or copy/paste.
  if (
    (privateKey.startsWith('"') && privateKey.endsWith('"')) ||
    (privateKey.startsWith("'") && privateKey.endsWith("'"))
  ) {
    privateKey = privateKey.slice(1, -1);
  }

  // Convert escaped newlines into real line breaks.
  // Order matters: handle double-escaped newlines first.
  privateKey = privateKey.replace(/\\\\n/g, "\n");
  privateKey = privateKey.replace(/\\n/g, "\n");
  privateKey = privateKey.replace(/\\r\\n/g, "\n");
  privateKey = privateKey.replace(/\r\n/g, "\n");

  // Clean accidental spaces on each line, then trim the whole key again.
  privateKey = privateKey
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();

  const startsCorrectly = privateKey.startsWith("-----BEGIN PRIVATE KEY-----");
  const endsCorrectly = privateKey.endsWith("-----END PRIVATE KEY-----");
  const hasRealNewLines = privateKey.includes("\n");

  console.log("Google private key formatting check:", {
    startsCorrectly,
    endsCorrectly,
    hasRealNewLines,
  });

  if (!startsCorrectly || !endsCorrectly || !hasRealNewLines) {
    console.error(
      "GOOGLE_PRIVATE_KEY is not formatted correctly. It must start with BEGIN PRIVATE KEY, end with END PRIVATE KEY, and contain real new lines."
    );
    return null;
  }

  return privateKey;
}

async function getCalendarClient() {
  const calendarId = process.env.GOOGLE_CALENDAR_ID?.trim();
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL?.trim();
  const privateKey = getFormattedPrivateKey();

  console.log("Google Calendar env check:", {
    hasGoogleCalendarId: !!calendarId,
    hasGoogleClientEmail: !!clientEmail,
    hasGooglePrivateKey: !!privateKey,
  });

  if (!calendarId || !clientEmail || !privateKey) {
    return null;
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });

  const calendar = google.calendar({
    version: "v3",
    auth,
  });

  return {
    calendar,
    calendarId,
  };
}

async function getCalendarSettings(charterNameInput?: string | null) {
  const { data: settings, error: settingsError } = await supabase
    .from("business_settings")
    .select("charter_name, timezone")
    .limit(1)
    .maybeSingle();

  if (settingsError) {
    console.error("Could not load calendar settings:", settingsError);
  }

  return {
    charterName: charterNameInput || settings?.charter_name || "David Charters",
    timezone: settings?.timezone || "America/Chicago",
  };
}

export async function createCalendarEvent(
  input: CreateCalendarEventInput
): Promise<string | null> {
  const calendarClient = await getCalendarClient();

  if (!calendarClient) {
    console.warn(
      "Google Calendar env vars missing or invalid. Skipping calendar event creation."
    );
    return null;
  }

  try {
    const { calendar, calendarId } = calendarClient;
    const { charterName, timezone } = await getCalendarSettings(input.charterName);

    const startTime = normalizeTime(input.startTime);
    const endTime = normalizeTime(input.endTime);
    const slotLabel = `${formatTimeTo12Hour(startTime)} - ${formatTimeTo12Hour(
      endTime
    )}`;

    const event = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: `${charterName} - ${input.customerName}`,
        description: [
          `Customer: ${input.customerName}`,
          `Email: ${input.customerEmail}`,
          `Phone: ${input.customerPhone || "Not provided"}`,
          `Guests: ${input.guestCount}`,
          `Occasion: ${input.occasion || "Not provided"}`,
          `Date: ${input.bookingDate}`,
          `Time: ${slotLabel}`,
          `Paid booking for ${charterName}`,
        ].join("\n"),
        start: {
          dateTime: buildIsoDateTime(input.bookingDate, startTime),
          timeZone: timezone,
        },
        end: {
          dateTime: buildIsoDateTime(input.bookingDate, endTime),
          timeZone: timezone,
        },
      },
    });

    return event.data.id ?? null;
  } catch (error) {
    console.error("Google Calendar event creation failed:", error);
    return null;
  }
}

export async function updateCalendarEvent(
  input: UpdateCalendarEventInput
): Promise<boolean> {
  const calendarClient = await getCalendarClient();

  if (!calendarClient) {
    console.warn(
      "Google Calendar env vars missing or invalid. Skipping calendar event update."
    );
    return false;
  }

  if (!input.eventId) {
    console.warn("Missing Google Calendar event ID. Skipping calendar event update.");
    return false;
  }

  try {
    const { calendar, calendarId } = calendarClient;
    const { charterName, timezone } = await getCalendarSettings(input.charterName);

    const startTime = normalizeTime(input.startTime);
    const endTime = normalizeTime(input.endTime);
    const slotLabel = `${formatTimeTo12Hour(startTime)} - ${formatTimeTo12Hour(
      endTime
    )}`;

    await calendar.events.update({
      calendarId,
      eventId: input.eventId,
      requestBody: {
        summary: `${charterName} - ${input.customerName}`,
        description: [
          `Customer: ${input.customerName}`,
          `Email: ${input.customerEmail}`,
          `Phone: ${input.customerPhone || "Not provided"}`,
          `Guests: ${input.guestCount}`,
          `Occasion: ${input.occasion || "Not provided"}`,
          `Date: ${input.bookingDate}`,
          `Time: ${slotLabel}`,
          `Paid booking for ${charterName}`,
          `Updated by admin reschedule`,
        ].join("\n"),
        start: {
          dateTime: buildIsoDateTime(input.bookingDate, startTime),
          timeZone: timezone,
        },
        end: {
          dateTime: buildIsoDateTime(input.bookingDate, endTime),
          timeZone: timezone,
        },
      },
    });

    return true;
  } catch (error) {
    console.error("Google Calendar event update failed:", error);
    return false;
  }
}

export async function deleteCalendarEvent(eventId: string): Promise<boolean> {
  const calendarClient = await getCalendarClient();

  if (!calendarClient) {
    console.warn(
      "Google Calendar env vars missing or invalid. Skipping calendar event delete."
    );
    return false;
  }

  if (!eventId) {
    console.warn("Missing Google Calendar event ID. Skipping calendar event delete.");
    return false;
  }

  try {
    const { calendar, calendarId } = calendarClient;

    await calendar.events.delete({
      calendarId,
      eventId,
    });

    return true;
  } catch (error) {
    console.error("Google Calendar event delete failed:", error);
    return false;
  }
}