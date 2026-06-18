import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { getGalleryFiles } from "@/lib/gallery";



export default function HomePage() {
  const galleryFiles = getGalleryFiles();
  return (
    <main className="bg-white text-slate-900">
      <Navbar />

      <section className="relative min-h-[88vh] overflow-hidden">
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source src="/gallery/IMG_1655.mp4" type="video/mp4" />
      </video>

  <div className="absolute inset-0 bg-black/45" />

  <div className="relative z-10 mx-auto flex min-h-[88vh] max-w-6xl items-center px-6 py-20">
          <div className="max-w-2xl text-white">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-blue-200">
              Private charter experience
            </p>

            <h1 className="text-4xl font-bold leading-tight sm:text-5xl md:text-6xl">
              Get out on the water with David's Charters
            </h1>

            <p className="mt-5 max-w-xl text-lg text-white/90 sm:text-xl">
            Private 4 hour charters with fuel included, no mandatory captain fee,
            and no hidden fees. Just book your slot and get ready for the lake.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/booking"
                className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-200"
              >
                Book Now
              </Link>

              <a
                href="#gallery"
                className="rounded-full border border-white/70 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                View Photos
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b bg-slate-50">
  <div className="mx-auto grid max-w-6xl gap-6 px-6 py-10 sm:grid-cols-2 lg:grid-cols-4">
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">
        Charter Length
      </p>
      <h2 className="mt-2 text-2xl font-bold">4 Hours</h2>
      <p className="mt-2 text-sm text-slate-600">
        Two daily slots: 11:00 AM to 3:00 PM and 3:30 PM to 7:30 PM.
      </p>
    </div>

    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">
        Simple Pricing
      </p>
      <h2 className="mt-2 text-2xl font-bold">$700 to $900</h2>
      <p className="mt-2 text-sm text-slate-600">
        Weekdays $700, Sundays $800, and Saturdays $900.
      </p>
    </div>

    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">
        Included
      </p>
      <h2 className="mt-2 text-2xl font-bold">Fuel Included</h2>
      <p className="mt-2 text-sm text-slate-600">
        No surprise fuel charge and no mandatory captain fee added later.
      </p>
    </div>

    <div className="rounded-2xl bg-white p-6 shadow-sm ring-2 ring-sky-200">
      <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">
        Big Seller
      </p>
      <h2 className="mt-2 text-2xl font-bold">No Hidden Fees</h2>
      <p className="mt-2 text-sm text-slate-600">
        The price you see is the price you book. Simple, clear, and upfront.
      </p>
    </div>
  </div>
</section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
              About the experience
            </p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
            Your own Lake Travis experience. Whether you want a relaxing family cruise, a laid back day on the water, or a full party boat experience at Devils Cove, David's Charters is built around your group.
            </h2>
            <p className="mt-5 text-lg text-slate-600">
            Your charter includes fuel, a slide, lily pad, bean bags, and one of the loudest sound systems on the lake. The goal is simple: make it easy to show up, have a great time, and enjoy the lake your way.
            
            </p>
            <p className="mt-4 text-lg text-slate-600">
            No mandatory captain fee. No surprise fuel charge. No hidden fees. Just
            straightforward pricing and a boat set up for a fun, easy day on the water.
            </p>

            <div className="mt-8">
              <Link
                href="/booking"
                className="inline-flex rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Reserve Your Charter
              </Link>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl shadow-xl">
            <Image
              src="/gallery/Austin_Pontoon Slide Lake Travis_0426-30.jpg"
              alt="David's charter boat"
              width={1200}
              height={900}
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      <section id="gallery" className="bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
              Gallery
            </p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
              See the boat and the experience
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
              A few looks at the boat, the views, and the kind of day your group
              can expect on the water.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {galleryFiles.map((file) => (
  <div
    key={file.src}
    className="overflow-hidden rounded-3xl bg-white shadow-sm"
  >
    {file.type === "image" ? (
      <Image
        src={file.src}
        alt="David's Charters gallery image"
        width={900}
        height={1200}
        className="h-[360px] w-full object-cover transition duration-300 hover:scale-105"
      />
    ) : (
      <video
        autoPlay
        muted
        loop
        playsInline
        className="h-[360px] w-full object-cover"
      >
        <source src={file.src} />
      </video>
    )}
  </div>
))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
  <div className="grid gap-6 lg:grid-cols-3">
    <div className="rounded-3xl border p-8">
      <h3 className="text-xl font-bold">Loaded with lake day features</h3>
      <p className="mt-3 text-slate-600">
        Slide, lily pad, bean bags, loud sound, and plenty of space to relax
        with your group.
      </p>
    </div>

    <div className="rounded-3xl border p-8">
      <h3 className="text-xl font-bold">No hidden fees</h3>
      <p className="mt-3 text-slate-600">
        Fuel is included and there is no mandatory captain fee. The goal is
        simple pricing that guests can trust.
      </p>
    </div>

    <div className="rounded-3xl border p-8">
      <h3 className="text-xl font-bold">Two easy time slots</h3>
      <p className="mt-3 text-slate-600">
        Choose 11:00 AM to 3:00 PM or 3:30 PM to 7:30 PM and lock in your
        private 4 hour charter.
      </p>
    </div>
  </div>
</section>
    </main>
  );
}