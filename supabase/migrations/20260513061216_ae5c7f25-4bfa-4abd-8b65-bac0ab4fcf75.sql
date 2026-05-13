UPDATE public.shared_state
SET value = jsonb_set(
  value,
  '{leads}',
  COALESCE(value->'leads', '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
    'id', 'srichakra1',
    'company', 'Srichakra',
    'sector', 'Manufacturing',
    'dealType', 'Single Tranche',
    'size', 18,
    'tenor', 4,
    'coupon', '',
    'stage', 'Active',
    'priority', 'High',
    'primaryPerson', 'Rahul',
    'secondaryPerson', 'Sakshi',
    'referredBy', 'Direct',
    'referredContact', '',
    'useOfFunds', 'Capex / Acquisition',
    'structure', 'Capex / Acquisition',
    'notes', 'Initial discussion and site visit completed. Pre-DD completed. Head of Terms and data request for note shared. | FY25 Rev of INR 226 Cr and EBITDA of INR 22 Cr. Total Debt of INR 107 Cr. Requirement for 51% acquisition of a company in similar space. Investment is through purchase of an extruder (INR 48 Cr) for production of plastic granules. Q1 financials look promising (INR 106 Cr and 11.5% EBITDA margin). Deal looks doable. Company also building capabilities in TN and Odisha and has lined up long term project financing for the same. 99 Cr equity raised so far of which promoters have put in INR 23 Cr. Balance from friends/family, family offices and circulate capital.',
    'updatedAt', to_jsonb(now())
  )),
  true
),
updated_at = now()
WHERE key = 'app-state'
  AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(COALESCE(value->'leads','[]'::jsonb)) l
    WHERE lower(l->>'company') = 'srichakra'
  );