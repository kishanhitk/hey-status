-- Create helper functions that bypass RLS
CREATE OR REPLACE FUNCTION "public"."is_org_member"(_user_id uuid, _organization_id uuid) 
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM users
    WHERE id = _user_id 
    AND organization_id = _organization_id
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION "public"."is_org_admin"(_user_id uuid, _organization_id uuid) 
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM users
    WHERE id = _user_id 
    AND organization_id = _organization_id 
    AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION "public"."is_org_editor_or_admin"(_user_id uuid, _organization_id uuid) 
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM users
    WHERE id = _user_id 
    AND organization_id = _organization_id 
    AND role IN ('admin', 'editor')
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_maintenances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services_scheduled_maintenances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_status_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uptime_daily_logs ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all users in their organization" ON public.users
    FOR SELECT USING (
        "public"."is_org_admin"(auth.uid(), organization_id)
    );

CREATE POLICY "Allow insert for authenticated users" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Organizations table policies
CREATE POLICY "Users can view their own organization" ON public.organizations
    FOR SELECT USING (
        "public"."is_org_member"(auth.uid(), id)
    );

CREATE POLICY "Admins can update their own organization" ON public.organizations
    FOR UPDATE USING (
        "public"."is_org_admin"(auth.uid(), id)
    );

-- Services table policies
CREATE POLICY "Users can view services in their organization" ON public.services
    FOR SELECT USING (
        "public"."is_org_member"(auth.uid(), organization_id)
    );

CREATE POLICY "Admins and editors can manage services" ON public.services
    FOR ALL USING (
        "public"."is_org_editor_or_admin"(auth.uid(), organization_id)
    );

-- Incidents table policies
CREATE POLICY "Users can view incidents in their organization" ON public.incidents
    FOR SELECT USING (
        "public"."is_org_member"(auth.uid(), organization_id)
    );

CREATE POLICY "Admins and editors can manage incidents" ON public.incidents
    FOR ALL USING (
        "public"."is_org_editor_or_admin"(auth.uid(), organization_id)
    );

-- Incident updates table policies
CREATE POLICY "Users can view incident updates in their organization" ON public.incident_updates
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.incidents
            WHERE id = incident_updates.incident_id
            AND "public"."is_org_member"(auth.uid(), organization_id)
        )
    );

CREATE POLICY "Admins and editors can manage incident updates" ON public.incident_updates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.incidents
            WHERE id = incident_updates.incident_id
            AND "public"."is_org_editor_or_admin"(auth.uid(), organization_id)
        )
    );

-- Scheduled maintenances table policies
CREATE POLICY "Users can view scheduled maintenances in their organization" ON public.scheduled_maintenances
    FOR SELECT USING (
        "public"."is_org_member"(auth.uid(), organization_id)
    );

CREATE POLICY "Admins and editors can manage scheduled maintenances" ON public.scheduled_maintenances
    FOR ALL USING (
        "public"."is_org_editor_or_admin"(auth.uid(), organization_id)
    );

-- Maintenance updates table policies
CREATE POLICY "Users can view maintenance updates in their organization" ON public.maintenance_updates
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.scheduled_maintenances
            WHERE id = maintenance_updates.scheduled_maintenance_id
            AND "public"."is_org_member"(auth.uid(), organization_id)
        )
    );

CREATE POLICY "Admins and editors can manage maintenance updates" ON public.maintenance_updates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.scheduled_maintenances
            WHERE id = maintenance_updates.scheduled_maintenance_id
            AND "public"."is_org_editor_or_admin"(auth.uid(), organization_id)
        )
    );

-- Services incidents table policies
CREATE POLICY "Users can view services incidents in their organization" ON public.services_incidents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.incidents
            WHERE id = services_incidents.incident_id
            AND "public"."is_org_member"(auth.uid(), organization_id)
        )
    );

CREATE POLICY "Admins and editors can manage services incidents" ON public.services_incidents
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.incidents
            WHERE id = services_incidents.incident_id
            AND "public"."is_org_editor_or_admin"(auth.uid(), organization_id)
        )
    );

-- Services scheduled maintenances table policies
CREATE POLICY "Users can view services scheduled maintenances in their organization" ON public.services_scheduled_maintenances
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.scheduled_maintenances
            WHERE id = services_scheduled_maintenances.scheduled_maintenance_id
            AND "public"."is_org_member"(auth.uid(), organization_id)
        )
    );

CREATE POLICY "Admins and editors can manage services scheduled maintenances" ON public.services_scheduled_maintenances
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.scheduled_maintenances
            WHERE id = services_scheduled_maintenances.scheduled_maintenance_id
            AND "public"."is_org_editor_or_admin"(auth.uid(), organization_id)
        )
    );

-- Invitations table policies
CREATE POLICY "Allow public to view specific invitation" ON public.invitations
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage invitations" ON public.invitations
    FOR ALL USING (
        "public"."is_org_admin"(auth.uid(), organization_id)
    );

-- Subscribers table policies
CREATE POLICY "Users can view subscribers in their organization" ON public.subscribers
    FOR SELECT USING (
        "public"."is_org_member"(auth.uid(), organization_id)
    );

CREATE POLICY "Admins and editors can manage subscribers" ON public.subscribers
    FOR ALL USING (
        "public"."is_org_editor_or_admin"(auth.uid(), organization_id)
    );

-- Service status logs table policies
CREATE POLICY "Users can view service status logs in their organization" ON public.service_status_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.services
            WHERE id = service_status_logs.service_id
            AND "public"."is_org_member"(auth.uid(), organization_id)
        )
    );

CREATE POLICY "Admins and editors can manage service status logs" ON public.service_status_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.services
            WHERE id = service_status_logs.service_id
            AND "public"."is_org_editor_or_admin"(auth.uid(), organization_id)
        )
    );

-- Uptime daily logs table policies
CREATE POLICY "Users can view uptime daily logs in their organization" ON public.uptime_daily_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.services
            WHERE id = uptime_daily_logs.service_id
            AND "public"."is_org_member"(auth.uid(), organization_id)
        )
    );

CREATE POLICY "Admins and editors can manage uptime daily logs" ON public.uptime_daily_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.services
            WHERE id = uptime_daily_logs.service_id
            AND "public"."is_org_editor_or_admin"(auth.uid(), organization_id)
        )
    );

-- Public access policies
CREATE POLICY "Allow public read access to organizations" ON public.organizations
    FOR SELECT USING (true);

CREATE POLICY "Allow public read access to services" ON public.services
    FOR SELECT USING (true);

CREATE POLICY "Allow public read access to incidents" ON public.incidents
    FOR SELECT USING (true);

CREATE POLICY "Allow public read access to incident updates" ON public.incident_updates
    FOR SELECT USING (true);

CREATE POLICY "Allow public read access to scheduled maintenances" ON public.scheduled_maintenances
    FOR SELECT USING (true);

CREATE POLICY "Allow public read access to maintenance updates" ON public.maintenance_updates
    FOR SELECT USING (true);

CREATE POLICY "Allow public read access to services incidents" ON public.services_incidents
    FOR SELECT USING (true);

CREATE POLICY "Allow public read access to services scheduled maintenances" ON public.services_scheduled_maintenances
    FOR SELECT USING (true);

CREATE POLICY "Allow public read access to service status logs" ON public.service_status_logs
    FOR SELECT USING (true);

CREATE POLICY "Allow public read access to uptime daily logs" ON public.uptime_daily_logs
    FOR SELECT USING (true);

-- Allow public to insert into subscribers
CREATE POLICY "Allow public to subscribe" ON public.subscribers
    FOR INSERT WITH CHECK (true);


-- Allow authenticated users to create an organization
CREATE POLICY "Authenticated users can create an organization" ON public.organizations
    FOR INSERT
    TO authenticated
    WITH CHECK (true);