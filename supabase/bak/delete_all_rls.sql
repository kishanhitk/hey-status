-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users in their organization" ON public.users;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.users;

DROP POLICY IF EXISTS "Users can view their own organization" ON public.organizations;
DROP POLICY IF EXISTS "Admins can update their own organization" ON public.organizations;
DROP POLICY IF EXISTS "Allow public read access to organizations" ON public.organizations;

DROP POLICY IF EXISTS "Users can view services in their organization" ON public.services;
DROP POLICY IF EXISTS "Admins and editors can manage services" ON public.services;
DROP POLICY IF EXISTS "Allow public read access to services" ON public.services;

DROP POLICY IF EXISTS "Users can view incidents in their organization" ON public.incidents;
DROP POLICY IF EXISTS "Admins and editors can manage incidents" ON public.incidents;
DROP POLICY IF EXISTS "Allow public read access to incidents" ON public.incidents;

DROP POLICY IF EXISTS "Users can view incident updates in their organization" ON public.incident_updates;
DROP POLICY IF EXISTS "Admins and editors can manage incident updates" ON public.incident_updates;
DROP POLICY IF EXISTS "Allow public read access to incident updates" ON public.incident_updates;

DROP POLICY IF EXISTS "Users can view scheduled maintenances in their organization" ON public.scheduled_maintenances;
DROP POLICY IF EXISTS "Admins and editors can manage scheduled maintenances" ON public.scheduled_maintenances;
DROP POLICY IF EXISTS "Allow public read access to scheduled maintenances" ON public.scheduled_maintenances;

DROP POLICY IF EXISTS "Users can view maintenance updates in their organization" ON public.maintenance_updates;
DROP POLICY IF EXISTS "Admins and editors can manage maintenance updates" ON public.maintenance_updates;
DROP POLICY IF EXISTS "Allow public read access to maintenance updates" ON public.maintenance_updates;

DROP POLICY IF EXISTS "Users can view services incidents in their organization" ON public.services_incidents;
DROP POLICY IF EXISTS "Admins and editors can manage services incidents" ON public.services_incidents;
DROP POLICY IF EXISTS "Allow public read access to services incidents" ON public.services_incidents;

DROP POLICY IF EXISTS "Users can view services scheduled maintenances in their organization" ON public.services_scheduled_maintenances;
DROP POLICY IF EXISTS "Admins and editors can manage services scheduled maintenances" ON public.services_scheduled_maintenances;
DROP POLICY IF EXISTS "Allow public read access to services scheduled maintenances" ON public.services_scheduled_maintenances;

DROP POLICY IF EXISTS "Allow public to view specific invitation" ON public.invitations;
DROP POLICY IF EXISTS "Admins can manage invitations" ON public.invitations;

DROP POLICY IF EXISTS "Users can view subscribers in their organization" ON public.subscribers;
DROP POLICY IF EXISTS "Admins and editors can manage subscribers" ON public.subscribers;
DROP POLICY IF EXISTS "Allow public to subscribe" ON public.subscribers;

DROP POLICY IF EXISTS "Users can view service status logs in their organization" ON public.service_status_logs;
DROP POLICY IF EXISTS "Admins and editors can manage service status logs" ON public.service_status_logs;
DROP POLICY IF EXISTS "Allow public read access to service status logs" ON public.service_status_logs;

DROP POLICY IF EXISTS "Users can view uptime daily logs in their organization" ON public.uptime_daily_logs;
DROP POLICY IF EXISTS "Admins and editors can manage uptime daily logs" ON public.uptime_daily_logs;
DROP POLICY IF EXISTS "Allow public read access to uptime daily logs" ON public.uptime_daily_logs;

-- Drop existing helper functions if they exist
DROP FUNCTION IF EXISTS is_org_member;
DROP FUNCTION IF EXISTS is_org_admin;
DROP FUNCTION IF EXISTS is_org_editor_or_admin;