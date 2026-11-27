begin;

-- Agreement data remains in the private administrative record accessed through the AMS API.
alter table public.associate_financial_details
  add column if not exists agreement_address text check (length(agreement_address) between 1 and 400),
  add column if not exists agreement_identity_number text check (length(agreement_identity_number) between 1 and 60);

revoke all on table public.associate_financial_details from anon, authenticated;

commit;
