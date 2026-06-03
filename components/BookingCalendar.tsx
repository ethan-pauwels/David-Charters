"use client";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export default function BookingCalendar({ value, onChange }: Props) {
  return (
    <div className="grid gap-2">
      <label htmlFor="booking-date" className="font-medium">
        Select a date
      </label>
      <input
        id="booking-date"
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-gray-300 p-3"
      />
    </div>
  );
}