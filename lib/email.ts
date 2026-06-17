import { Resend } from "resend";

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value.trim();
}

function getOptionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

function getResendClient() {
  const apiKey = getRequiredEnv("RESEND_API_KEY");
  return new Resend(apiKey);
}

function normalizeTime(time: string): string {
  return time.length === 5 ? `${time}:00` : time;
}

function formatTimeTo12Hour(time: string): string {
  const normalized = normalizeTime(time);
  const [hourString, minuteString] = normalized.split(":");

  const hour = Number(hourString);
  const minute = Number(minuteString);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return time;
  }

  const suffix = hour >= 12 ? "PM" : "AM";
  const adjusted = hour % 12 === 0 ? 12 : hour % 12;

  return `${adjusted}:${minute.toString().padStart(2, "0")} ${suffix}`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.BASE_URL ||
    "https://www.davidscharters.com"
  ).replace(/\/$/, "");
}

function stringifyError(error: unknown): string {
  if (!error) return "Unknown error";

  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return String(error);
  }
}

export async function sendCustomerEmail({
  to,
  name,
  date,
  startTime,
  endTime,
  charterName,
}: {
  to: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  charterName: string;
}) {
  const resend = getResendClient();

  const emailFrom = getRequiredEnv("EMAIL_FROM");
  const replyTo = getOptionalEnv("REPLY_TO");

  const slot = `${formatTimeTo12Hour(startTime)} - ${formatTimeTo12Hour(
    endTime
  )}`;

  const baseUrl = getBaseUrl();
  const parkingMapUrl = `${baseUrl}/parking-map.jpeg`;

  const safeName = escapeHtml(name);
  const safeDate = escapeHtml(date);
  const safeSlot = escapeHtml(slot);
  const safeCharterName = escapeHtml(charterName);

  const subject = "Your David Charters booking is confirmed 🎉";

  const text = `
You're booked!

Hey ${name},

Your private charter has been confirmed.

Booking Details:
Charter: ${charterName}
Date: ${date}
Time: ${slot}

Pickup Location:
17141 Rocky Ridge Rd, Austin, TX 78734
Pickup Spot: C2
Walk all the way down A Dock, then take a left. It is the first pontoon on the right.

Parking Information:
If there is an attendant in the parking lot, entry is typically $20 per car, or $5 per person if you are part of a party boat group, unless prior arrangements have been made.

Cancellation Policy:
Charters may not be canceled within 14 days of the scheduled booking date unless approved by the captain.

Weather Policy:
We do not cancel charters based solely on weather forecasts. Final weather-related decisions are made by the captain based on actual conditions and guest safety.

Parking and Dock Map:
${parkingMapUrl}

We look forward to seeing you on the water!
  `.trim();

  const html = `
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6; max-width: 640px; margin: 0 auto;">
      <h2 style="color: #0f172a;">You're booked! 🚤</h2>

      <p>Hey ${safeName},</p>

      <p>Your private charter has been confirmed. Here are the important details for your trip:</p>

      <div style="background: #f1f5f9; padding: 16px; border-radius: 12px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Booking Details</h3>
        <p><strong>Charter:</strong> ${safeCharterName}</p>
        <p><strong>Date:</strong> ${safeDate}</p>
        <p><strong>Time:</strong> ${safeSlot}</p>
      </div>

      <div style="background: #eff6ff; padding: 16px; border-radius: 12px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Pickup Location</h3>
        <p><strong>Address:</strong><br />17141 Rocky Ridge Rd, Austin, TX 78734</p>
        <p><strong>Pickup Spot:</strong> C2</p>
        <p>
          Walk all the way down <strong>A Dock</strong>, then take a left.
          It is the first pontoon on the right.
        </p>
      </div>

      <div style="background: #fff7ed; padding: 16px; border-radius: 12px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Parking Information</h3>
        <p>If there is an attendant in the parking lot, entry is typically:</p>
        <ul>
          <li><strong>$20 per car</strong>, or</li>
          <li><strong>$5 per person</strong> if you are part of a party boat group</li>
        </ul>
        <p>Unless prior arrangements have been made.</p>
      </div>

      <div style="background: #fef2f2; padding: 16px; border-radius: 12px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Cancellation & Weather Policy</h3>

        <p>
          <strong>Cancellation Policy:</strong>
          Charters may not be canceled within 14 days of the scheduled booking date
          unless approved by the captain.
        </p>

        <p>
          <strong>Weather Policy:</strong>
          We do not cancel charters based solely on weather forecasts.
          Final weather-related decisions are made by the captain based on actual
          conditions and guest safety.
        </p>
      </div>

      <div style="margin: 24px 0;">
        <h3>Parking and Dock Map</h3>

        <img
          src="${parkingMapUrl}"
          alt="Parking and pickup map for David Charters"
          style="width: 100%; max-width: 640px; border-radius: 12px; border: 1px solid #e2e8f0;"
        />

        <p style="margin-top: 10px;">
          <a
            href="${parkingMapUrl}"
            style="color: #0369a1; font-weight: bold;"
          >
            Click here to view the parking and pickup map
          </a>
        </p>
      </div>

      <p>We look forward to seeing you on the water!</p>

      <p style="font-size: 13px; color: #64748b;">
        If you have any questions before your charter, simply reply to this email.
      </p>
    </div>
  `;

  console.log("Resend customer email attempt:", {
    to,
    from: emailFrom,
    replyTo: replyTo || null,
    subject,
  });

  const { data, error } = await resend.emails.send({
    from: emailFrom,
    to,
    ...(replyTo ? { replyTo } : {}),
    subject,
    html,
    text,
  });

  console.log("Resend customer email response:", { data, error });

  if (error) {
    throw new Error(`Resend customer email failed: ${stringifyError(error)}`);
  }

  return data;
}

export async function sendAdminEmail({
  name,
  email,
  date,
  startTime,
  endTime,
  charterName,
}: {
  name: string;
  email: string;
  date: string;
  startTime: string;
  endTime: string;
  charterName: string;
}) {
  const resend = getResendClient();

  const emailFrom = getRequiredEnv("EMAIL_FROM");
  const adminEmail = getRequiredEnv("ADMIN_EMAIL");

  const slot = `${formatTimeTo12Hour(startTime)} - ${formatTimeTo12Hour(
    endTime
  )}`;

  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeDate = escapeHtml(date);
  const safeSlot = escapeHtml(slot);
  const safeCharterName = escapeHtml(charterName);

  const subject = "New booking 🚤";

  const text = `
New booking received

Name: ${name}
Email: ${email}
Date: ${date}
Time: ${slot}
Charter: ${charterName}
  `.trim();

  const html = `
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6; max-width: 640px;">
      <h2>New booking received 🚤</h2>

      <div style="background: #f1f5f9; padding: 16px; border-radius: 12px; margin: 20px 0;">
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        <p><strong>Date:</strong> ${safeDate}</p>
        <p><strong>Time:</strong> ${safeSlot}</p>
        <p><strong>Charter:</strong> ${safeCharterName}</p>
      </div>
    </div>
  `;

  console.log("Resend admin email attempt:", {
    to: adminEmail,
    from: emailFrom,
    replyTo: email,
    subject,
  });

  const { data, error } = await resend.emails.send({
    from: emailFrom,
    to: adminEmail,
    replyTo: email,
    subject,
    html,
    text,
  });

  console.log("Resend admin email response:", { data, error });

  if (error) {
    throw new Error(`Resend admin email failed: ${stringifyError(error)}`);
  }

  return data;
}