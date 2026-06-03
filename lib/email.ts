import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function formatTimeTo12Hour(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  const suffix = hour >= 12 ? "PM" : "AM";
  const adjusted = hour % 12 === 0 ? 12 : hour % 12;
  return `${adjusted}:${minute.toString().padStart(2, "0")} ${suffix}`;
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
  const slot = `${formatTimeTo12Hour(startTime)} - ${formatTimeTo12Hour(endTime)}`;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  const parkingMapUrl = `${baseUrl}/parking-map.jpeg`;

  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to,
    subject: "Your David Charters booking is confirmed 🎉",
    html: `
      <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6; max-width: 640px; margin: 0 auto;">
        <h2 style="color: #0f172a;">You're booked! 🚤</h2>

        <p>Hey ${name},</p>

        <p>Your private charter has been confirmed. Here are the important details for your trip:</p>

        <div style="background: #f1f5f9; padding: 16px; border-radius: 12px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Booking Details</h3>
          <p><strong>Charter:</strong> ${charterName}</p>
          <p><strong>Date:</strong> ${date}</p>
          <p><strong>Time:</strong> ${slot}</p>
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
    `,
  });
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
  const slot = `${formatTimeTo12Hour(startTime)} - ${formatTimeTo12Hour(endTime)}`;

  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: process.env.ADMIN_EMAIL!,
    subject: "New booking 🚤",
    html: `
      <h2>New booking received</h2>

      <p><strong>${name}</strong></p>
      <p>${email}</p>

      <p>Date: ${date}</p>
      <p>Time: ${slot}</p>

      <p>${charterName}</p>
    `,
  });
}