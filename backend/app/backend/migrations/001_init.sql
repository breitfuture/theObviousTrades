-- Core tables
create extension if not exists pgcrypto; -- for gen_random_uuid()


create table if not exists accounts (
id uuid primary key default gen_random_uuid(),
name text not null,
provider text not null default 'manual',
provider_account_id text null,
last_sync_at timestamptz,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now()
);


create table if not exists securities (
id uuid primary key default gen_random_uuid(),
ticker text not null unique,
name text,
exchange text,
sector text,
currency text default 'USD'
);


create table if not exists holdings (
id uuid primary key default gen_random_uuid(),
account_id uuid null references accounts(id) on delete set null,
security_id uuid not null references securities(id) on delete cascade,
quantity numeric not null,
cost_basis numeric null, -- avg cost per share
as_of date not null,
unique(account_id, security_id, as_of)
);
create index if not exists holdings_asof_idx on holdings(as_of);


create table if not exists prices (
id bigserial primary key,
security_id uuid not null references securities(id) on delete cascade,
date date not null,
close numeric not null,
unique(security_id, date)
);
create index if not exists prices_date_idx on prices(date);


create table if not exists notes (
security_id uuid primary key references securities(id) on delete cascade,
thesis text,
catalyst text,
invalidation text,
risks text,
conviction smallint
);


