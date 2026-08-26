CREATE TABLE public.ke_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name text NOT NULL,
  generic_name text NOT NULL,
  generic_key text NOT NULL,
  strength text,
  dosage_form text,
  manufacturer text,
  country_of_origin text,
  registration_status text NOT NULL DEFAULT 'listed',
  ppb_registration_no text,
  atc_code text,
  atc_class text,
  data_source text NOT NULL DEFAULT 'curated-sample',
  verification_note text NOT NULL DEFAULT 'Curated sample — verify against the official Pharmacy and Poisons Board register before relying on it.',
  source_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_ke_products_generic_key ON public.ke_products (generic_key);
CREATE INDEX idx_ke_products_brand ON public.ke_products (lower(brand_name));
CREATE INDEX idx_ke_products_atc ON public.ke_products (atc_code);

GRANT SELECT ON public.ke_products TO anon, authenticated;
GRANT ALL ON public.ke_products TO service_role;

ALTER TABLE public.ke_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read Kenya products"
  ON public.ke_products FOR SELECT TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_ke_products_updated_at
  BEFORE UPDATE ON public.ke_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.ke_products
  (brand_name, generic_name, generic_key, strength, dosage_form, manufacturer, country_of_origin, registration_status, atc_code, atc_class, source_url)
VALUES
  ('Panadol', 'Paracetamol', 'acetaminophen', '500 mg', 'Tablet', 'GlaxoSmithKline', 'Kenya', 'registered', 'N02BE01', 'Anilides (analgesic/antipyretic)', 'https://web.pharmacyboardkenya.org/registers/'),
  ('Hedex', 'Paracetamol', 'acetaminophen', '500 mg', 'Tablet', 'GlaxoSmithKline', 'Kenya', 'registered', 'N02BE01', 'Anilides (analgesic/antipyretic)', 'https://web.pharmacyboardkenya.org/registers/'),
  ('Parafex', 'Paracetamol', 'acetaminophen', '120 mg/5 ml', 'Oral suspension', 'Cosmos Limited', 'Kenya', 'registered', 'N02BE01', 'Anilides (analgesic/antipyretic)', 'https://web.pharmacyboardkenya.org/registers/'),
  ('Brufen', 'Ibuprofen', 'ibuprofen', '400 mg', 'Tablet', 'Abbott', 'India', 'registered', 'M01AE01', 'Propionic acid derivatives (NSAID)', 'https://web.pharmacyboardkenya.org/registers/'),
  ('Ibupain', 'Ibuprofen', 'ibuprofen', '200 mg', 'Tablet', 'Regal Pharmaceuticals', 'Kenya', 'registered', 'M01AE01', 'Propionic acid derivatives (NSAID)', 'https://web.pharmacyboardkenya.org/registers/'),
  ('Amoxil', 'Amoxicillin', 'amoxicillin', '500 mg', 'Capsule', 'GlaxoSmithKline', 'United Kingdom', 'registered', 'J01CA04', 'Penicillins with extended spectrum', 'https://web.pharmacyboardkenya.org/registers/'),
  ('Amoxykel', 'Amoxicillin', 'amoxicillin', '250 mg', 'Capsule', 'Laboratory & Allied Limited', 'Kenya', 'registered', 'J01CA04', 'Penicillins with extended spectrum', 'https://web.pharmacyboardkenya.org/registers/'),
  ('Augmentin', 'Amoxicillin/Clavulanic acid', 'amoxicillin', '625 mg', 'Tablet', 'GlaxoSmithKline', 'United Kingdom', 'registered', 'J01CR02', 'Beta-lactam/beta-lactamase inhibitor', 'https://web.pharmacyboardkenya.org/registers/'),
  ('Flagyl', 'Metronidazole', 'metronidazole', '400 mg', 'Tablet', 'Sanofi', 'France', 'registered', 'J01XD01', 'Imidazole derivatives', 'https://web.pharmacyboardkenya.org/registers/'),
  ('Metrozole', 'Metronidazole', 'metronidazole', '200 mg', 'Tablet', 'Dawa Limited', 'Kenya', 'registered', 'J01XD01', 'Imidazole derivatives', 'https://web.pharmacyboardkenya.org/registers/'),
  ('Glucophage', 'Metformin hydrochloride', 'metformin', '500 mg', 'Tablet', 'Merck', 'France', 'registered', 'A10BA02', 'Biguanides', 'https://web.pharmacyboardkenya.org/registers/'),
  ('Metfoni', 'Metformin hydrochloride', 'metformin', '850 mg', 'Tablet', 'Universal Corporation Limited', 'Kenya', 'registered', 'A10BA02', 'Biguanides', 'https://web.pharmacyboardkenya.org/registers/'),
  ('Zestril', 'Lisinopril', 'lisinopril', '10 mg', 'Tablet', 'AstraZeneca', 'United Kingdom', 'registered', 'C09AA03', 'ACE inhibitors, plain', 'https://web.pharmacyboardkenya.org/registers/'),
  ('Amlopin', 'Amlodipine besylate', 'amlodipine', '5 mg', 'Tablet', 'Cosmos Limited', 'Kenya', 'registered', 'C08CA01', 'Dihydropyridine calcium channel blockers', 'https://web.pharmacyboardkenya.org/registers/'),
  ('Lipitor', 'Atorvastatin calcium', 'atorvastatin', '20 mg', 'Tablet', 'Pfizer', 'Germany', 'registered', 'C10AA05', 'HMG CoA reductase inhibitors', 'https://web.pharmacyboardkenya.org/registers/'),
  ('Losec', 'Omeprazole', 'omeprazole', '20 mg', 'Capsule', 'AstraZeneca', 'Sweden', 'registered', 'A02BC01', 'Proton pump inhibitors', 'https://web.pharmacyboardkenya.org/registers/'),
  ('Omezol', 'Omeprazole', 'omeprazole', '20 mg', 'Capsule', 'Universal Corporation Limited', 'Kenya', 'registered', 'A02BC01', 'Proton pump inhibitors', 'https://web.pharmacyboardkenya.org/registers/'),
  ('Coartem', 'Artemether/Lumefantrine', 'artemether', '20/120 mg', 'Tablet', 'Novartis', 'Switzerland', 'registered', 'P01BF01', 'Artemisinin-based combination therapy', 'https://web.pharmacyboardkenya.org/registers/'),
  ('Duo-Cotecxin', 'Dihydroartemisinin/Piperaquine', 'dihydroartemisinin', '40/320 mg', 'Tablet', 'Holley-Cotec', 'China', 'registered', 'P01BF05', 'Artemisinin-based combination therapy', 'https://web.pharmacyboardkenya.org/registers/'),
  ('Zithromax', 'Azithromycin', 'azithromycin', '500 mg', 'Tablet', 'Pfizer', 'Italy', 'registered', 'J01FA10', 'Macrolides', 'https://web.pharmacyboardkenya.org/registers/'),
  ('Cetzine', 'Cetirizine hydrochloride', 'cetirizine', '10 mg', 'Tablet', 'Dr Reddys', 'India', 'registered', 'R06AE07', 'Piperazine derivatives (antihistamine)', 'https://web.pharmacyboardkenya.org/registers/'),
  ('Ventolin', 'Salbutamol', 'albuterol', '100 mcg/dose', 'Inhaler', 'GlaxoSmithKline', 'United Kingdom', 'registered', 'R03AC02', 'Selective beta-2 adrenoreceptor agonists', 'https://web.pharmacyboardkenya.org/registers/'),
  ('Warfarin Sodium', 'Warfarin sodium', 'warfarin', '5 mg', 'Tablet', 'Zydus', 'India', 'registered', 'B01AA03', 'Vitamin K antagonists', 'https://web.pharmacyboardkenya.org/registers/'),
  ('Ozempic', 'Semaglutide', 'semaglutide', '1 mg/dose', 'Solution for injection', 'Novo Nordisk', 'Denmark', 'registered', 'A10BJ06', 'GLP-1 receptor agonists', 'https://web.pharmacyboardkenya.org/registers/'),
  ('Prednisolone', 'Prednisolone', 'prednisolone', '5 mg', 'Tablet', 'Laboratory & Allied Limited', 'Kenya', 'registered', 'H02AB06', 'Glucocorticoids', 'https://web.pharmacyboardkenya.org/registers/'),
  ('Diclofenac Sodium', 'Diclofenac sodium', 'diclofenac', '50 mg', 'Tablet', 'Dawa Limited', 'Kenya', 'registered', 'M01AB05', 'Acetic acid derivatives (NSAID)', 'https://web.pharmacyboardkenya.org/registers/');