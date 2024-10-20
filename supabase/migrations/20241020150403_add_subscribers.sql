-- Create subscribers table
CREATE TABLE public.subscribers (
    id UUID DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (organization_id, email)
);

-- Create index for faster lookups
CREATE INDEX idx_subscribers_organization_id ON public.subscribers (organization_id);

-- Enable row-level security
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- Create policy to allow insert for all
CREATE POLICY "Allow public insert to subscribers" ON public.subscribers
    FOR INSERT TO public
    WITH CHECK (true);

-- Create policy to allow organization members to view subscribers
CREATE POLICY "Allow organization members to view subscribers" ON public.subscribers
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id
            FROM public.users
            WHERE id = auth.uid()
        )
    );


-- Webhook to notify subscribers of new incident updates
create trigger "notify_subscribers_new_incident_update" after insert
on "public"."incident_updates" for each row
execute function "supabase_functions"."http_request"(
  'http://host.docker.internal:54321/functions/v1/send-mail-to-subscribers',
  'POST',
  '{"Content-Type":"application/json"}',
  '{}',
  '1000'
);
