create extension if not exists pgcrypto;

create table if not exists bookings (
    id uuid primary key default gen_random_uuid(),

    customer_name text not null,
    customer_email text not null,
    customer_phone text,

    booking_date date not null,
    start_time time not null,
    end_time time not null,

    price_cents integer not null default 20000,

    status text not null default 'confirmed'
        check (status in ('pending', 'confirmed', 'cancelled')),

    stripe_checkout_session_id text unique,
    stripe_payment_intent_id text,
    google_event_id text,

    notes text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists blocked_slots (
    id uuid primary key default gen_random_uuid(),

    booking_date date not null,
    start_time time not null,
    end_time time not null,

    reason text,

    created_at timestamptz not null default now()
);

create unique index if not exists unique_confirmed_booking_slot
on bookings (booking_date, start_time, end_time)
where status = 'confirmed';

create index if not exists idx_bookings_booking_date on bookings (booking_date);
create index if not exists idx_bookings_status on bookings (status);
create index if not exists idx_blocked_slots_booking_date on blocked_slots (booking_date);

create or replace function set_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists bookings_set_updated_at on bookings;

create trigger bookings_set_updated_at
before update on bookings
for each row
execute function set_updated_at();