import { Suspense } from "react";
import Navbar from "@/components/Navbar";
import BookingPageClient from "./BookingPageClient";

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
      <BookingPageClient />
    </Suspense>
  );
}