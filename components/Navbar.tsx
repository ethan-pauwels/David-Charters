import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="border-b">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-xl font-bold">
          David Charters
        </Link>

        <div className="flex gap-4 text-sm">
          <Link href="/">Home</Link>
          <Link href="/booking">Book</Link>
          <Link href="/admin">Admin</Link>
        </div>
      </div>
    </nav>
  );
}