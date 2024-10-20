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
