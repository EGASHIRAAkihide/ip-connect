-- 0009_add_payment_status_to_inquiries.sql
-- Adds payment_status column if missing (historical PoC support).

alter table inquiries
  add column if not exists payment_status text not null default 'unpaid'
  check (payment_status in ('unpaid', 'invoiced', 'paid_simulated'));
