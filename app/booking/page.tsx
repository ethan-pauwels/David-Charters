"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import BookingCalendar from "@/components/BookingCalendar";
import TimeSlotPicker from "@/components/TimeSlotPicker";
import Button from "@/components/Button";
import { formatCurrency } from "@/lib/utils";
import type { AvailabilityResponse } from "@/types/booking";

function BookingPageContent() {
  const searchParams = useSearchParams();

  const success = searchParams.get("success") === "1";
  const canceled = searchParams.get("canceled") === "1";

  const [date, setDate] = useState("");
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [selectedStart, setSelectedStart] = useState("");
  const [selectedEnd, setSelectedEnd] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pageError, setPageError] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [guestCount, setGuestCount] = useState("1");
  const [occasion, setOccasion] = useState("");

  const selectedDayOfWeek = date ? new Date(`${date}T00:00:00`).getDay() : null;

  const fallbackPriceCents =
    selectedDayOfWeek === 6
      ? 90000
      : selectedDayOfWeek === 0
        ? 80000
        : 70000;

  const selectedSlot = availability?.slots.find(
    (slot) => slot.start === selectedStart && slot.end === selectedEnd
  );

  const slotPriceCents =
    selectedSlot && "price_cents" in selectedSlot
      ? Number(selectedSlot.price_cents)
      : null;

  const currentPriceCents =
    typeof slotPriceCents === "number" && slotPriceCents > 0
      ? slotPriceCents
      : fallbackPriceCents;

  const currentCharterName = availability?.settings?.charter_name ?? "Your charter";

  const priceNote =
    selectedSlot &&
    "price_note" in selectedSlot &&
    typeof selectedSlot.price_note === "string"
      ? selectedSlot.price_note
      : null;

  useEffect(() => {
    if (success) {
      setCustomerName("");
      setCustomerEmail("");
      setCustomerPhone("");
      setMarketingOptIn(false);
      setSelectedStart("");
      setSelectedEnd("");
      setPageError("");
      setGuestCount("1");
      setOccasion("");
    }
  }, [success]);

  useEffect(() => {
    if (!date) {
      setAvailability(null);
      setSelectedStart("");
      setSelectedEnd("");
      return;
    }

    async function fetchAvailability() {
      setLoadingSlots(true);
      setPageError("");
      setSelectedStart("");
      setSelectedEnd("");

      try {
        const res = await fetch(`/api/availability?date=${date}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to load availability.");
        }

        setAvailability(data);
      } catch (error) {
        console.error(error);
        setAvailability(null);
        setPageError("Could not load availability for that date.");
      } finally {
        setLoadingSlots(false);
      }
    }

    fetchAvailability();
  }, [date]);

  const selectedLabel = useMemo(() => {
    return availability?.slots.find((slot) => slot.start === selectedStart)?.label ?? "";
  }, [availability, selectedStart]);

  const isReadyToBook =
    !!date &&
    !!selectedStart &&
    !!selectedEnd &&
    !!customerName.trim() &&
    !!customerEmail.trim() &&
    Number(guestCount) >= 1 &&
    Number(guestCount) <= 12;

  async function handleCheckout() {
    if (!date || !selectedStart || !selectedEnd || !customerName || !customerEmail) {
      setPageError("Please complete your date, time slot, name, and email before continuing.");
      return;
    }

    setSubmitting(true);
    setPageError("");

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerName,
          customerEmail,
          customerPhone,
          bookingDate: date,
          startTime: selectedStart,
          endTime: selectedEnd,
          marketingOptIn,
          guestCount: Number(guestCount),
          occasion,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to start checkout.");
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error(error);
      setPageError("Could not start checkout. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="bg-white text-slate-900">
      <Navbar />

      <section className="border-b bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 text-white">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-300">
            Secure your charter
          </p>
          <h1 className="mt-3 text-4xl font-bold sm:text-5xl">
            Book your day on the water
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-white/80">
            Choose your date, pick an available time slot, and lock in your private
            4 hour charter in just a few minutes.
          </p>
        </div>
      </section>

      <section className="border-b bg-slate-50">
        <div className="mx-auto grid max-w-6xl gap-4 px-6 py-8 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">
              Private charter
            </p>
            <p className="mt-2 text-sm text-slate-600">
              A clean and simple booking flow for your group, not a crowded public tour.
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">
              Weekend availability
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Choose from two daily time slots: 11:00 AM to 3:00 PM or 3:30 PM to 7:30 PM.
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">
              Secure checkout
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Confirm your booking details first, then continue to payment with confidence.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        {success && (
          <div className="mb-8 rounded-3xl border border-green-300 bg-green-50 p-6 text-green-900 shadow-sm">
            <h2 className="text-2xl font-bold">You are booked</h2>
            <p className="mt-2 text-sm sm:text-base">
              Payment was received and your charter request has been submitted successfully.
              Your selected time slot should now be reserved.
            </p>
          </div>
        )}

        {canceled && (
          <div className="mb-8 rounded-3xl border border-yellow-300 bg-yellow-50 p-6 text-yellow-900 shadow-sm">
            <h2 className="text-2xl font-bold">Checkout was canceled</h2>
            <p className="mt-2 text-sm sm:text-base">
              No payment was completed, and your reservation was not saved. You can choose a
              time slot and try again whenever you are ready.
            </p>
          </div>
        )}

        {pageError && (
          <div className="mb-8 rounded-3xl border border-red-300 bg-red-50 p-6 text-red-800 shadow-sm">
            <h2 className="text-xl font-bold">Something needs attention</h2>
            <p className="mt-2 text-sm sm:text-base">{pageError}</p>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div className="space-y-8">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-800">
                  1
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">
                    Step 1
                  </p>
                  <h2 className="text-2xl font-bold">Select your date</h2>
                </div>
              </div>

              <BookingCalendar value={date} onChange={setDate} />
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-800">
                  2
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">
                    Step 2
                  </p>
                  <h2 className="text-2xl font-bold">Choose a time slot</h2>
                </div>
              </div>

              {!date && (
                <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  Pick a date first to see available charter times.
                </p>
              )}

              {loadingSlots && (
                <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  Checking availability...
                </p>
              )}

              {availability && (
                <>
                  <div className="mb-4 rounded-2xl bg-slate-50 p-4">
                    <p className="text-lg font-semibold text-slate-900">
                      {availability.dayName} availability
                    </p>

                    {!availability.allowedBookingDay && (
                      <p className="mt-2 text-sm text-red-600">
                        No available charter slots for this date.
                      </p>
                    )}
                  </div>

                  <TimeSlotPicker
                    slots={availability.slots}
                    selectedStart={selectedStart}
                    onSelect={(start, end) => {
                      setSelectedStart(start);
                      setSelectedEnd(end);
                      setPageError("");
                    }}
                  />
                </>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-800">
                  3
                </div>

                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">
                    Step 3
                  </p>

                  <h2 className="text-2xl font-bold">
                    Who is this booking for
                  </h2>
                </div>
              </div>

              <div className="grid gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Full name
                  </label>

                  <input
                    type="text"
                    placeholder="Enter your full name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Email address
                  </label>

                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Phone number
                  </label>

                  <input
                    type="tel"
                    placeholder="Optional"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Guest count
                  </label>

                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={guestCount}
                    onChange={(e) => setGuestCount(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                  />

                  <p className="mt-1 text-xs text-slate-500">
                    Maximum 12 guests.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    What is the occasion?
                  </label>

                  <input
                    type="text"
                    placeholder="Birthday, bachelor party, family cruise, chill lake day..."
                    value={occasion}
                    onChange={(e) => setOccasion(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                  />
                </div>

                <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={marketingOptIn}
                    onChange={(e) => setMarketingOptIn(e.target.checked)}
                    className="mt-1"
                  />

                  <span>
                    Send me occasional deals, promos, and future charter updates.
                  </span>
                </label>
              </div>
            </section>

            <section className="grid gap-5 md:grid-cols-3">
              <div className="rounded-3xl border bg-white p-6 shadow-sm">
                <h3 className="text-lg font-bold">What you are booking</h3>
                <p className="mt-2 text-sm text-slate-600">
                  A private 4 hour charter with fuel included, no mandatory captain fee, and no hidden fees.
                </p>
              </div>

              <div className="rounded-3xl border bg-white p-6 shadow-sm">
                <h3 className="text-lg font-bold">Booking policy</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Your selected time slot is reserved after successful payment.
                </p>
              </div>

              <div className="rounded-3xl border bg-white p-6 shadow-sm">
                <h3 className="text-lg font-bold">Why guests like it</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Straightforward pricing with no surprise fuel charge, no mandatory captain fee, and no hidden fees.
                </p>
              </div>
            </section>
          </div>

          <aside className="lg:sticky lg:top-24">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
                Booking summary
              </p>

              <h2 className="mt-3 text-2xl font-bold">{currentCharterName}</h2>

              <div className="mt-6 space-y-4">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Date
                  </p>
                  <p className="mt-1 text-base font-semibold text-slate-900">
                    {date || "Not selected"}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Time slot
                  </p>
                  <p className="mt-1 text-base font-semibold text-slate-900">
                    {selectedLabel || "Not selected"}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Charter length
                  </p>
                  <p className="mt-1 text-base font-semibold text-slate-900">
                    4 hours
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl bg-sky-50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-medium text-slate-700">Total</span>
                  <span className="text-2xl font-bold text-slate-900">
                    {formatCurrency(currentPriceCents)}
                  </span>
                </div>

                {priceNote && (
                  <p className="mt-3 rounded-xl bg-white/80 px-3 py-2 text-sm font-medium text-sky-900">
                    {priceNote}
                  </p>
                )}

                <p className="mt-2 text-xs text-slate-500">
                  Fuel included. No mandatory captain fee. No hidden fees.
                </p>
              </div>

              <div className="mt-6">
                <Button onClick={handleCheckout} disabled={submitting || !isReadyToBook}>
                  {submitting
                    ? "Starting checkout..."
                    : isReadyToBook
                      ? "Continue to secure checkout"
                      : "Complete your booking details"}
                </Button>
              </div>

              <div className="mt-6 border-t border-slate-200 pt-6">
                <p className="text-sm font-semibold text-slate-900">Included</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  <li>Private 4 hour charter</li>
                  <li>70 quart cooler</li>
                  <li>20 lbs of ice included</li>
                  <li>Fuel included</li>
                  <li>No mandatory captain fee</li>
                  <li>No hidden fees</li>
                  <li>Slide, lily pad, and bean bags included</li>
                  <li>Two daily time slots: 11:00 AM or 3:30 PM</li>
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

export default function BookingPage() {
  return (
    <Suspense
      fallback={
        <main className="bg-white text-slate-900">
          <Navbar />
          <section className="mx-auto max-w-6xl px-6 py-16">
            <p className="text-slate-600">Loading booking page...</p>
          </section>
        </main>
      }
    >
      <BookingPageContent />
    </Suspense>
  );
}