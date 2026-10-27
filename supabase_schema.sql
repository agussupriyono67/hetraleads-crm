-- ==============================================================================
-- DATABASE SCHEMA: CENTRAL CRM (LEADS TRACKING MULTI-PLATFORM)
-- Dibuat untuk: PT Hetra Teknologi Indonesia / Central CAD & CadSolution
-- Engine: PostgreSQL / Supabase
-- ==============================================================================

-- 1. Enable UUID Extension
create extension if not exists "uuid-ossp";

-- 2. Buat Tabel Utama 'leads'
create table if not exists public.leads (
    id uuid primary key default uuid_generate_v4(),
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null,
    
    -- Sumber & Kampanye
    source_platform varchar(100) default 'google_sheets' not null, -- 'centralcad.id', 'cadsolution.co.id', 'orderonline', 'google_sheets', 'webinar'
    campaign_name varchar(150),                                   -- Nama Iklan / Event / UTM Campaign
    
    -- Data Prospek (Lead Info)
    nama_lengkap varchar(255) not null,
    nama_perusahaan varchar(255),
    no_whatsapp varchar(50) not null,
    email varchar(255),
    kota_lokasi varchar(150),
    bidang_industri varchar(150),                                 -- 'Manufaktur', 'Konstruksi', 'Konsultan', dll
    
    -- Kebutuhan Software CAD
    produk_minat varchar(150) default 'ZWCAD 2026',               -- 'ZWCAD Professional', 'ZWCAD Standard', 'ZW3D', 'Network Floating'
    estimasi_lisensi integer default 1,
    kebutuhan_detail text,
    
    -- Status Pipeline CRM
    status varchar(50) default 'NEW' not null,                     -- 'NEW', 'CONTACTED', 'TRIAL_ACTIVE', 'DEMO_VISIT', 'QUOTATION', 'PO_DEAL', 'LOST'
    sales_pic varchar(100) default 'Unassigned',
    catatan_followup text,
    
    -- Flag & Metadata
    is_duplicate boolean default false,
    external_id varchar(100),                                     -- ID Baris Sheet atau ID OrderOnline
    metadata jsonb default '{}'::jsonb
);

-- 3. Trigger Otomatis Update Kolom 'updated_at'
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_leads_updated_at on public.leads;
create trigger trigger_leads_updated_at
    before update on public.leads
    for each row
    execute function public.handle_updated_at();

-- 4. Trigger Otomatis Deteksi Duplikasi Nomor WhatsApp
create or replace function public.check_lead_duplicate()
returns trigger as $$
declare
    clean_wa text;
    existing_count integer;
begin
    -- Bersihkan format nomor WA (hanya angka)
    clean_wa := regexp_replace(new.no_whatsapp, '[^0-9]', '', 'g');
    
    -- Normalisasi awalan 08 ke 628
    if clean_wa like '08%' then
        clean_wa := '62' || substring(clean_wa from 2);
    end if;
    
    new.no_whatsapp := clean_wa;

    -- Cek apakah nomor ini sudah ada sebelumnya di database
    select count(*) into existing_count
    from public.leads
    where no_whatsapp = clean_wa
      and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

    if existing_count > 0 then
        new.is_duplicate := true;
    else
        new.is_duplicate := false;
    end if;

    return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_leads_check_duplicate on public.leads;
create trigger trigger_leads_check_duplicate
    before insert or update on public.leads
    for each row
    execute function public.check_lead_duplicate();

-- 5. Indexing untuk Performa Kueri Real-time & Cepat
create index if not exists idx_leads_created_at on public.leads (created_at desc);
create index if not exists idx_leads_no_whatsapp on public.leads (no_whatsapp);
create index if not exists idx_leads_status on public.leads (status);
create index if not exists idx_leads_source on public.leads (source_platform);

-- 6. Aktifkan Fitur Realtime Supabase (WebSocket)
alter publication supabase_realtime add table public.leads;

-- 7. Aturan Akses Keamanan (Row Level Security)
alter table public.leads enable row level security;

-- Policy: Izinkan Read/Write dengan API Key (Anon / Service Role)
create policy "Allow public access for dashboard & webhooks" 
    on public.leads 
    for all 
    using (true) 
    with check (true);

-- 8. View Ringkasan Metrik Harian
create or replace view public.view_leads_metrics as
select
    count(*) as total_leads,
    count(*) filter (where status = 'NEW') as total_new,
    count(*) filter (where status in ('CONTACTED', 'TRIAL_ACTIVE', 'DEMO_VISIT', 'QUOTATION')) as total_in_progress,
    count(*) filter (where status = 'PO_DEAL') as total_won,
    count(*) filter (where created_at >= date_trunc('day', now())) as leads_today,
    count(*) filter (where is_duplicate = true) as total_duplicates
from public.leads;
