"use client";

import type { AvailabilitySlot } from "@/types/booking";

type Props = {
  slots: AvailabilitySlot[];
  selectedStart: string;
  onSelect: (start: string, end: string) => void;
};

export default function TimeSlotPicker({
  slots,
  selectedStart,
  onSelect,
}: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {slots.map((slot) => {
        const selected = selectedStart === slot.start;

        return (
          <button
            key={`${slot.start}-${slot.end}`}
            type="button"
            disabled={!slot.available}
            onClick={() => onSelect(slot.start, slot.end)}
            className={`rounded-2xl border p-4 text-left transition shadow-sm ${
              selected
                ? "border-sky-600 bg-sky-600 text-white shadow-md"
                : "border-gray-300 bg-white hover:border-sky-400 hover:shadow-md"
            } ${!slot.available ? "cursor-not-allowed opacity-50" : ""}`}
          >
            <div className="text-lg font-semibold">{slot.label}</div>

            <div
              className={`mt-1 text-sm ${
                selected
                  ? "text-white/85"
                  : slot.available
                    ? "text-green-600"
                    : "text-gray-400"
              }`}
            >
              {slot.available ? "Available" : "Unavailable"}
            </div>
          </button>
        );
      })}
    </div>
  );
}