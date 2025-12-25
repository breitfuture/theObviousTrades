-- Minimal seed to make /positions return rows immediately
insert into securities (ticker, name, exchange, sector)
values
('AAPL','Apple Inc.','NASDAQ','Technology'),
('MSFT','Microsoft Corp.','NASDAQ','Technology')
on conflict (ticker) do nothing;


-- Assume 2025-10-31 snapshot
insert into holdings (account_id, security_id, quantity, cost_basis, as_of)
select null, id, 10, 150.00, date '2025-10-31' from securities where ticker='AAPL'
on conflict do nothing;


insert into holdings (account_id, security_id, quantity, cost_basis, as_of)
select null, id, 5, 350.00, date '2025-10-31' from securities where ticker='MSFT'
on conflict do nothing;


-- Latest prices (adjust dates as needed)
insert into prices (security_id, date, close)
select id, date '2025-10-31', 170.00 from securities where ticker='AAPL'
on conflict do nothing;


insert into prices (security_id, date, close)
select id, date '2025-10-31', 380.00 from securities where ticker='MSFT'
on conflict do nothing;


-- Example convictions
insert into notes (security_id, conviction)
select id, 4 from securities where ticker='AAPL'
on conflict (security_id) do update set conviction=excluded.conviction;


insert into notes (security_id, conviction)
select id, 5 from securities where ticker='MSFT'
on conflict (security_id) do update set conviction=excluded.conviction;

