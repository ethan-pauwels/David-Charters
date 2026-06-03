import Link from "next/link";

export default function BookingSuccessPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-3xl border border-white/15 bg-white/10 p-8 shadow-2xl md:p-12">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 text-3xl text-green-300">
            ✓
          </div>

          <h1 className="mb-4 text-4xl font-bold md:text-5xl">
            Your charter is booked!
          </h1>

          <p className="mb-8 text-lg text-slate-300">
            Thanks for booking with David Charters. Your payment was successful,
            your reservation has been confirmed, and a confirmation email is on
            the way.
          </p>

          <div className="mb-8 grid gap-4">
            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
              <h2 className="mb-2 text-xl font-semibold">What happens next?</h2>
              <p className="text-slate-300">
                Check your inbox for your confirmation email. It contains your
                booking details, pickup information, parking instructions, and
                dock map. If you do not see the email, check your Promotions or
                Spam folder.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
              <h2 className="mb-2 text-xl font-semibold">Pickup Location</h2>

              <p className="text-slate-300">
                <strong>Address:</strong>
                <br />
                17141 Rocky Ridge Rd
                <br />
                Austin, TX 78734
              </p>

              <p className="mt-3 text-slate-300">
                <strong>Pickup Spot:</strong> C2
              </p>

              <p className="mt-2 text-slate-300">
                Walk all the way down <strong>A Dock</strong>, then take a left.
                The boat is the first pontoon on the right.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
              <h2 className="mb-2 text-xl font-semibold">Before Your Trip</h2>

              <ul className="list-disc space-y-1 pl-5 text-slate-300">
                <li>Arrive 10 to 15 minutes early.</li>
                <li>Bring sunglasses, sunscreen, and water.</li>
                <li>Have your group ready at the dock before departure.</li>
                <li>Keep an eye out for reminder emails before your charter.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
              <h2 className="mb-2 text-xl font-semibold">Parking Information</h2>

              <p className="text-slate-300">
                If there is an attendant at the parking lot, parking is typically:
              </p>

              <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-300">
                <li>$20 per vehicle</li>
                <li>$5 per person for party boat groups</li>
              </ul>

              <p className="mt-2 text-slate-300">
                Unless prior arrangements have been made.
              </p>
            </div>

            <div className="rounded-2xl border border-red-500/30 bg-red-900/20 p-5">
              <h2 className="mb-2 text-xl font-semibold text-red-200">
                Cancellation & Weather Policy
              </h2>

              <p className="text-slate-300">
                <strong>Cancellation Policy:</strong> Charters may not be
                canceled within 14 days of the scheduled booking date unless
                approved by the captain.
              </p>

              <p className="mt-3 text-slate-300">
                <strong>Weather Policy:</strong> We do not cancel charters based
                solely on weather forecasts. Final weather-related decisions are
                made by the captain based on actual conditions and guest safety.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
              <h2 className="mb-2 text-xl font-semibold">Need Help?</h2>

              <p className="text-slate-300">
                Reply to your confirmation email if you have any questions
                regarding your charter, arrival instructions, or your booking.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/"
              className="rounded-xl bg-white px-6 py-3 text-center font-semibold text-slate-950 transition hover:bg-slate-200"
            >
              Back to Home
            </Link>

            <Link
              href="/booking"
              className="rounded-xl border border-white/20 px-6 py-3 text-center font-semibold transition hover:bg-white/10"
            >
              Book Another Charter
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}