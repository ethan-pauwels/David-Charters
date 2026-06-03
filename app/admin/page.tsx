"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Link from "next/link";

type Booking = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
};

type BlockedSlot = {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  reason: string | null;
};

type WeeklyAvailability = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
};

const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

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

function formatTimeRange(start: string, end: string): string {
  return `${formatTimeTo12Hour(start)} - ${formatTimeTo12Hour(end)}`;
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [weeklyAvailability, setWeeklyAvailability] = useState<
    WeeklyAvailability[]
  >([]);

  const [newBlockDate, setNewBlockDate] = useState("");
  const [newBlockStart, setNewBlockStart] = useState("");
  const [newBlockEnd, setNewBlockEnd] = useState("");
  const [newBlockReason, setNewBlockReason] = useState("");

  const [newDayOfWeek, setNewDayOfWeek] = useState("5");
  const [newStartTime, setNewStartTime] = useState("");
  const [newEndTime, setNewEndTime] = useState("");

  const [overrideDate, setOverrideDate] = useState("");
  const [overrideTimeSlot, setOverrideTimeSlot] = useState(
    "11:00:00-15:00:00"
  );
  const [overridePrice, setOverridePrice] = useState("");
  const [overrideNote, setOverrideNote] = useState("");

  const [rescheduleForms, setRescheduleForms] = useState<
    Record<string, { booking_date: string; time_slot: string }>
  >({});

  function handleLogin() {
    if (username === "BigD" && password === "iloveethan") {
      setAuthenticated(true);
      return;
    }

    alert("Invalid credentials.");
  }

  async function loadData() {
    const [bookingsRes, blockedRes, settingsRes] = await Promise.all([
      fetch("/api/admin/bookings"),
      fetch("/api/admin/blocked-slots"),
      fetch("/api/admin/settings"),
    ]);

    const bookingsData = await bookingsRes.json();
    const blockedData = await blockedRes.json();
    const settingsData = await settingsRes.json();

    if (bookingsRes.ok) setBookings(bookingsData);
    if (blockedRes.ok) setBlockedSlots(blockedData);
    if (settingsRes.ok) {
      setWeeklyAvailability(settingsData.weeklyAvailability);
    }
  }

  useEffect(() => {
    if (authenticated) {
      loadData();
    }
  }, [authenticated]);

  async function saveDateOverride() {
    const [startTime, endTime] = overrideTimeSlot.split("-");

    const res = await fetch("/api/admin/date-price", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        booking_date: overrideDate,
        start_time: startTime,
        end_time: endTime,
        price_cents: Math.round(Number(overridePrice) * 100),
        note: overrideNote,
      }),
    });

    if (res.ok) {
      alert("Override saved.");
      setOverrideDate("");
      setOverrideTimeSlot("11:00:00-15:00:00");
      setOverridePrice("");
      setOverrideNote("");
    } else {
      alert("Failed to save override.");
    }
  }

  async function addBlockedSlot() {
    const res = await fetch("/api/admin/blocked-slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        booking_date: newBlockDate,
        start_time: newBlockStart,
        end_time: newBlockEnd,
        reason: newBlockReason,
      }),
    });

    if (res.ok) {
      setNewBlockDate("");
      setNewBlockStart("");
      setNewBlockEnd("");
      setNewBlockReason("");
      loadData();
    }
  }

  async function deleteBlockedSlot(id: string) {
    await fetch(`/api/admin/blocked-slots?id=${id}`, { method: "DELETE" });
    loadData();
  }

  async function addWeeklyAvailability() {
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        day_of_week: Number(newDayOfWeek),
        start_time: newStartTime,
        end_time: newEndTime,
        is_active: true,
      }),
    });

    if (res.ok) {
      setNewDayOfWeek("5");
      setNewStartTime("");
      setNewEndTime("");
      loadData();
    }
  }

  async function deleteWeeklyAvailability(id: string) {
    await fetch(`/api/admin/settings?id=${id}`, { method: "DELETE" });
    loadData();
  }

  async function updateBookingStatus(id: string, status: string) {
    const res = await fetch("/api/admin/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        updates: { status },
      }),
    });

    const data = await res.json();

    if (res.ok) {
      alert(data.warning || data.message || "Booking status updated.");
      loadData();
    } else {
      alert(data.error || "Failed to update booking status.");
    }
  }

  async function rescheduleBooking(id: string) {
    const form = rescheduleForms[id];

    if (!form?.booking_date || !form?.time_slot) {
      alert("Please choose a new date and time slot.");
      return;
    }

    const [startTime, endTime] = form.time_slot.split("-");

    const res = await fetch("/api/admin/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        updates: {
          booking_date: form.booking_date,
          start_time: startTime,
          end_time: endTime,
        },
      }),
    });

    const data = await res.json();

    if (res.ok) {
      alert(data.warning || data.message || "Booking rescheduled successfully.");
      setRescheduleForms((current) => {
        const copy = { ...current };
        delete copy[id];
        return copy;
      });
      loadData();
    } else {
      alert(data.error || "Failed to reschedule booking.");
    }
  }

  async function deleteBooking(id: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this booking? This will also try to delete the Google Calendar event."
    );

    if (!confirmed) return;

    const res = await fetch(`/api/admin/bookings?id=${id}`, {
      method: "DELETE",
    });

    const data = await res.json();

    if (res.ok) {
      alert(data.warning || data.message || "Booking deleted successfully.");
      loadData();
    } else {
      alert(data.error || "Failed to delete booking.");
    }
  }

  if (!authenticated) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <section className="flex min-h-screen items-center justify-center px-6">
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white p-8 text-slate-900 shadow-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
              Admin Access
            </p>
            <h1 className="mt-3 text-3xl font-bold">David Charters</h1>
            <p className="mt-2 text-sm text-slate-600">
              Sign in to manage bookings, availability, blocked slots, and
              business settings.
            </p>

            <div className="mt-6 grid gap-4">
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
              />

              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleLogin();
                }}
                className="rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
              />

              <button
                onClick={handleLogin}
                className="rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-700"
              >
                Login
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="bg-slate-50 text-slate-900">
      <Navbar />

      <section className="border-b bg-slate-950 text-white">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-300">
            Admin Dashboard
          </p>
          <h1 className="mt-3 text-4xl font-bold">Manage David Charters</h1>
          <p className="mt-3 max-w-2xl text-white/75">
            Update booking settings, manage availability, block off dates, and
            review reservations.
          </p>

          <div className="mt-6">
            <Link
              href="/admin/customers"
              className="inline-flex rounded-2xl bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-slate-200"
            >
              View Customer Database
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-8">
          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold">Date Pricing Override</h2>
            <p className="mt-2 text-sm text-slate-600">
              Set a custom price for a specific booking date and time slot.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-4">
              <input
                type="date"
                value={overrideDate}
                onChange={(e) => setOverrideDate(e.target.value)}
                className="rounded-2xl border border-slate-300 p-3"
              />

              <select
                value={overrideTimeSlot}
                onChange={(e) => setOverrideTimeSlot(e.target.value)}
                className="rounded-2xl border border-slate-300 p-3"
              >
                <option value="11:00:00-15:00:00">
                  11:00 AM - 3:00 PM
                </option>
                <option value="15:30:00-19:30:00">
                  3:30 PM - 7:30 PM
                </option>
              </select>

              <input
                type="number"
                placeholder="Price in dollars"
                value={overridePrice}
                onChange={(e) => setOverridePrice(e.target.value)}
                className="rounded-2xl border border-slate-300 p-3"
              />

              <input
                type="text"
                placeholder="Note optional"
                value={overrideNote}
                onChange={(e) => setOverrideNote(e.target.value)}
                className="rounded-2xl border border-slate-300 p-3"
              />

              <button
                onClick={saveDateOverride}
                className="rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-700 md:col-span-4"
              >
                Save Date Price Override
              </button>
            </div>
          </div>

          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold">Weekly Availability</h2>

            <div className="mt-5 grid gap-4 md:grid-cols-4">
              <select
                value={newDayOfWeek}
                onChange={(e) => setNewDayOfWeek(e.target.value)}
                className="rounded-2xl border border-slate-300 p-3"
              >
                {dayNames.map((day, index) => (
                  <option key={day} value={index}>
                    {day}
                  </option>
                ))}
              </select>

              <input
                type="time"
                value={newStartTime}
                onChange={(e) => setNewStartTime(e.target.value)}
                className="rounded-2xl border border-slate-300 p-3"
              />

              <input
                type="time"
                value={newEndTime}
                onChange={(e) => setNewEndTime(e.target.value)}
                className="rounded-2xl border border-slate-300 p-3"
              />

              <button
                onClick={addWeeklyAvailability}
                className="rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white"
              >
                Add Slot
              </button>
            </div>

            <div className="mt-6 grid gap-3">
              {weeklyAvailability.map((slot) => (
                <div
                  key={slot.id}
                  className="flex items-center justify-between rounded-2xl border p-4"
                >
                  <div>
                    <p className="font-semibold">
                      {dayNames[slot.day_of_week]} |{" "}
                      {formatTimeRange(slot.start_time, slot.end_time)}
                    </p>
                    <p className="text-sm text-slate-600">
                      {slot.is_active ? "Active" : "Inactive"}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteWeeklyAvailability(slot.id)}
                    className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold">Blocked Slots</h2>

            <div className="mt-5 grid gap-4 md:grid-cols-4">
              <input
                type="date"
                value={newBlockDate}
                onChange={(e) => setNewBlockDate(e.target.value)}
                className="rounded-2xl border border-slate-300 p-3"
              />
              <input
                type="time"
                value={newBlockStart}
                onChange={(e) => setNewBlockStart(e.target.value)}
                className="rounded-2xl border border-slate-300 p-3"
              />
              <input
                type="time"
                value={newBlockEnd}
                onChange={(e) => setNewBlockEnd(e.target.value)}
                className="rounded-2xl border border-slate-300 p-3"
              />
              <input
                type="text"
                value={newBlockReason}
                onChange={(e) => setNewBlockReason(e.target.value)}
                className="rounded-2xl border border-slate-300 p-3"
                placeholder="Reason"
              />
              <button
                onClick={addBlockedSlot}
                className="rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white md:col-span-4"
              >
                Add Blocked Slot
              </button>
            </div>

            <div className="mt-6 grid gap-3">
              {blockedSlots.map((slot) => (
                <div
                  key={slot.id}
                  className="flex items-center justify-between rounded-2xl border p-4"
                >
                  <div>
                    <p className="font-semibold">
                      {slot.booking_date} |{" "}
                      {formatTimeRange(slot.start_time, slot.end_time)}
                    </p>
                    <p className="text-sm text-slate-600">
                      {slot.reason || "No reason"}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteBlockedSlot(slot.id)}
                    className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold">Bookings</h2>

            <div className="mt-6 grid gap-3">
              {bookings.map((booking) => (
                <div key={booking.id} className="rounded-2xl border p-4">
                  <p className="font-semibold">
                    {booking.customer_name} | {booking.booking_date} |{" "}
                    {formatTimeRange(booking.start_time, booking.end_time)}
                  </p>
                  <p className="text-sm text-slate-600">
                    {booking.customer_email}
                  </p>
                  <p className="text-sm text-slate-600">
                    {booking.customer_phone || "No phone"}
                  </p>

                  <div className="mt-4 grid gap-3">
                    <div className="flex flex-wrap gap-3">
                      <select
                        value={booking.status}
                        onChange={(e) =>
                          updateBookingStatus(booking.id, e.target.value)
                        }
                        className="rounded-xl border p-2"
                      >
                        <option value="confirmed">confirmed</option>
                        <option value="pending">pending</option>
                        <option value="cancelled">cancelled</option>
                      </select>

                      <button
                        onClick={() => deleteBooking(booking.id)}
                        className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white"
                      >
                        Delete
                      </button>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="mb-3 text-sm font-semibold text-slate-700">
                        Reschedule Booking
                      </p>

                      <div className="grid gap-3 md:grid-cols-3">
                        <input
                          type="date"
                          value={
                            rescheduleForms[booking.id]?.booking_date ?? ""
                          }
                          onChange={(e) =>
                            setRescheduleForms((current) => ({
                              ...current,
                              [booking.id]: {
                                booking_date: e.target.value,
                                time_slot:
                                  current[booking.id]?.time_slot ??
                                  `${normalizeTime(
                                    booking.start_time
                                  )}-${normalizeTime(booking.end_time)}`,
                              },
                            }))
                          }
                          className="rounded-xl border border-slate-300 p-2"
                        />

                        <select
                          value={
                            rescheduleForms[booking.id]?.time_slot ??
                            `${normalizeTime(
                              booking.start_time
                            )}-${normalizeTime(booking.end_time)}`
                          }
                          onChange={(e) =>
                            setRescheduleForms((current) => ({
                              ...current,
                              [booking.id]: {
                                booking_date:
                                  current[booking.id]?.booking_date ??
                                  booking.booking_date,
                                time_slot: e.target.value,
                              },
                            }))
                          }
                          className="rounded-xl border border-slate-300 p-2"
                        >
                          <option value="11:00:00-15:00:00">
                            11:00 AM - 3:00 PM
                          </option>
                          <option value="15:30:00-19:30:00">
                            3:30 PM - 7:30 PM
                          </option>
                        </select>

                        <button
                          onClick={() => rescheduleBooking(booking.id)}
                          className="rounded-xl bg-sky-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-sky-800"
                        >
                          Reschedule
                        </button>
                      </div>

                      <p className="mt-2 text-xs text-slate-500">
                        This updates the booking and the matching Google
                        Calendar event.
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}