alter table inquiries
  add column if not exists payment_status text not null default 'unpaid'
  check (payment_status in ('unpaid', 'invoiced', 'paid_simulated'));
