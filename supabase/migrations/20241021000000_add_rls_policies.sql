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
        EXISTS (
            SELECT 1 FROM public.users AS u
            WHERE u.id = auth.uid() AND u.role = 'admin' AND u.organization_id = users.organization_id
        )
    );

-- Organizations table policies
CREATE POLICY "Users can view their own organization" ON public.organizations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.organization_id = organizations.id
        )
    );

CREATE POLICY "Admins can update their own organization" ON public.organizations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'admin' AND users.organization_id = organizations.id
        )
    );

-- Services table policies
CREATE POLICY "Users can view services in their organization" ON public.services
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.organization_id = services.organization_id
        )
    );

CREATE POLICY "Admins and editors can manage services" ON public.services
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.organization_id = services.organization_id AND users.role IN ('admin', 'editor')
        )
    );

-- Incidents table policies
CREATE POLICY "Users can view incidents in their organization" ON public.incidents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.organization_id = incidents.organization_id
        )
    );

CREATE POLICY "Admins and editors can manage incidents" ON public.incidents
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.organization_id = incidents.organization_id AND users.role IN ('admin', 'editor')
        )
    );

-- Incident updates table policies
CREATE POLICY "Users can view incident updates in their organization" ON public.incident_updates
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.incidents
            JOIN public.users ON users.organization_id = incidents.organization_id
            WHERE users.id = auth.uid() AND incidents.id = incident_updates.incident_id
        )
    );

CREATE POLICY "Admins and editors can manage incident updates" ON public.incident_updates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.incidents
            JOIN public.users ON users.organization_id = incidents.organization_id
            WHERE users.id = auth.uid() AND incidents.id = incident_updates.incident_id AND users.role IN ('admin', 'editor')
        )
    );

-- Scheduled maintenances table policies
CREATE POLICY "Users can view scheduled maintenances in their organization" ON public.scheduled_maintenances
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.organization_id = scheduled_maintenances.organization_id
        )
    );

CREATE POLICY "Admins and editors can manage scheduled maintenances" ON public.scheduled_maintenances
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.organization_id = scheduled_maintenances.organization_id AND users.role IN ('admin', 'editor')
        )
    );

-- Maintenance updates table policies
CREATE POLICY "Users can view maintenance updates in their organization" ON public.maintenance_updates
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.scheduled_maintenances
            JOIN public.users ON users.organization_id = scheduled_maintenances.organization_id
            WHERE users.id = auth.uid() AND scheduled_maintenances.id = maintenance_updates.scheduled_maintenance_id
        )
    );

CREATE POLICY "Admins and editors can manage maintenance updates" ON public.maintenance_updates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.scheduled_maintenances
            JOIN public.users ON users.organization_id = scheduled_maintenances.organization_id
            WHERE users.id = auth.uid() AND scheduled_maintenances.id = maintenance_updates.scheduled_maintenance_id AND users.role IN ('admin', 'editor')
        )
    );

-- Services incidents table policies
CREATE POLICY "Users can view services incidents in their organization" ON public.services_incidents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.incidents
            JOIN public.users ON users.organization_id = incidents.organization_id
            WHERE users.id = auth.uid() AND incidents.id = services_incidents.incident_id
        )
    );

CREATE POLICY "Admins and editors can manage services incidents" ON public.services_incidents
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.incidents
            JOIN public.users ON users.organization_id = incidents.organization_id
            WHERE users.id = auth.uid() AND incidents.id = services_incidents.incident_id AND users.role IN ('admin', 'editor')
        )
    );

-- Services scheduled maintenances table policies
CREATE POLICY "Users can view services scheduled maintenances in their organization" ON public.services_scheduled_maintenances
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.scheduled_maintenances
            JOIN public.users ON users.organization_id = scheduled_maintenances.organization_id
            WHERE users.id = auth.uid() AND scheduled_maintenances.id = services_scheduled_maintenances.scheduled_maintenance_id
        )
    );

CREATE POLICY "Admins and editors can manage services scheduled maintenances" ON public.services_scheduled_maintenances
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.scheduled_maintenances
            JOIN public.users ON users.organization_id = scheduled_maintenances.organization_id
            WHERE users.id = auth.uid() AND scheduled_maintenances.id = services_scheduled_maintenances.scheduled_maintenance_id AND users.role IN ('admin', 'editor')
        )
    );

-- Invitations table policies
CREATE POLICY "Users can view invitations in their organization" ON public.invitations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.organization_id = invitations.organization_id
        )
    );

CREATE POLICY "Admins can manage invitations" ON public.invitations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.organization_id = invitations.organization_id AND users.role = 'admin'
        )
    );

-- Subscribers table policies
CREATE POLICY "Users can view subscribers in their organization" ON public.subscribers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.organization_id = subscribers.organization_id
        )
    );

CREATE POLICY "Admins and editors can manage subscribers" ON public.subscribers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.organization_id = subscribers.organization_id AND users.role IN ('admin', 'editor')
        )
    );

-- Service status logs table policies
CREATE POLICY "Users can view service status logs in their organization" ON public.service_status_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.services
            JOIN public.users ON users.organization_id = services.organization_id
            WHERE users.id = auth.uid() AND services.id = service_status_logs.service_id
        )
    );

CREATE POLICY "Admins and editors can manage service status logs" ON public.service_status_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.services
            JOIN public.users ON users.organization_id = services.organization_id
            WHERE users.id = auth.uid() AND services.id = service_status_logs.service_id AND users.role IN ('admin', 'editor')
        )
    );

-- Uptime daily logs table policies
CREATE POLICY "Users can view uptime daily logs in their organization" ON public.uptime_daily_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.services
            JOIN public.users ON users.organization_id = services.organization_id
            WHERE users.id = auth.uid() AND services.id = uptime_daily_logs.service_id
        )
    );

CREATE POLICY "Admins and editors can manage uptime daily logs" ON public.uptime_daily_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.services
            JOIN public.users ON users.organization_id = services.organization_id
            WHERE users.id = auth.uid() AND services.id = uptime_daily_logs.service_id AND users.role IN ('admin', 'editor')
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
