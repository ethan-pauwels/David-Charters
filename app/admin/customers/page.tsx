"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  marketing_opt_in: boolean;
  total_bookings: number;
  last_booking_date: string | null;
  created_at: string;
};

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCustomers() {
      const res = await fetch("/api/admin/customers");
      const data = await res.json();
      setCustomers(data.customers || []);
      setLoading(false);
    }

    fetchCustomers();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400">Admin</p>
            <h1 className="text-4xl font-bold">Customers</h1>
            <p className="mt-2 text-slate-300">
              View customer contact info, booking history, and promo opt ins.
            </p>
          </div>

          <Link
            href="/admin"
            className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/10"
          >
            Back to Admin
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          {loading ? (
            <p className="p-6 text-slate-300">Loading customers...</p>
          ) : customers.length === 0 ? (
            <p className="p-6 text-slate-300">No customers yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/10 text-slate-300">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Promo Opt In</th>
                    <th className="px-4 py-3">Bookings</th>
                    <th className="px-4 py-3">Last Booking</th>
                  </tr>
                </thead>

                <tbody>
                  {customers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="border-t border-white/10 hover:bg-white/5"
                    >
                      <td className="px-4 py-3 font-medium">
                        {customer.name}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {customer.email}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {customer.phone || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {customer.marketing_opt_in ? (
                          <span className="rounded-full bg-green-500/20 px-3 py-1 text-xs font-semibold text-green-300">
                            Yes
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-500/20 px-3 py-1 text-xs font-semibold text-slate-300">
                            No
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {customer.total_bookings || 0}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {customer.last_booking_date || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}