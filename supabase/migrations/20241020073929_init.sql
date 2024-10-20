

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgsodium" WITH SCHEMA "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'avatar_url');
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."incident_updates" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "incident_id" "uuid" NOT NULL,
    "status" "text" NOT NULL,
    "message" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "created_by" "uuid" NOT NULL,
    CONSTRAINT "incident_updates_status_check" CHECK (("status" = ANY (ARRAY['investigating'::"text", 'identified'::"text", 'monitoring'::"text", 'resolved'::"text"])))
);


ALTER TABLE "public"."incident_updates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."incidents" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "impact" "text" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" timestamp with time zone,
    CONSTRAINT "incidents_impact_check" CHECK (("impact" = ANY (ARRAY['none'::"text", 'minor'::"text", 'major'::"text", 'critical'::"text"])))
);


ALTER TABLE "public"."incidents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invitations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "created_by" "uuid" NOT NULL,
    CONSTRAINT "invitations_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'editor'::"text", 'viewer'::"text"])))
);


ALTER TABLE "public"."invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."maintenance_updates" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "scheduled_maintenance_id" "uuid" NOT NULL,
    "message" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "created_by" "uuid" NOT NULL
);


ALTER TABLE "public"."maintenance_updates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "created_by" "uuid" NOT NULL
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scheduled_maintenances" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "organization_id" "uuid" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "impact" "text",
    CONSTRAINT "scheduled_maintenances_impact_check" CHECK (("impact" = ANY (ARRAY['none'::"text", 'minor'::"text", 'major'::"text", 'critical'::"text"])))
);


ALTER TABLE "public"."scheduled_maintenances" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_status_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "service_id" "uuid" NOT NULL,
    "status" "text" NOT NULL,
    "started_at" timestamp with time zone NOT NULL,
    "ended_at" timestamp with time zone,
    CONSTRAINT "service_status_logs_status_check" CHECK (("status" = ANY (ARRAY['operational'::"text", 'degraded_performance'::"text", 'partial_outage'::"text", 'major_outage'::"text"])))
);


ALTER TABLE "public"."service_status_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."services" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "organization_id" "uuid" NOT NULL,
    "current_status" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "url" "text",
    CONSTRAINT "services_current_status_check" CHECK (("current_status" = ANY (ARRAY['operational'::"text", 'degraded_performance'::"text", 'partial_outage'::"text", 'major_outage'::"text"])))
);


ALTER TABLE "public"."services" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."services_incidents" (
    "service_id" "uuid" NOT NULL,
    "incident_id" "uuid" NOT NULL
);


ALTER TABLE "public"."services_incidents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."services_scheduled_maintenances" (
    "service_id" "uuid" NOT NULL,
    "scheduled_maintenance_id" "uuid" NOT NULL
);


ALTER TABLE "public"."services_scheduled_maintenances" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."uptime_daily_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "service_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "uptime_percentage" numeric(5,2) NOT NULL
);


ALTER TABLE "public"."uptime_daily_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text",
    "avatar_url" "text",
    "organization_id" "uuid",
    "role" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'editor'::"text", 'viewer'::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."incident_updates"
    ADD CONSTRAINT "incident_updates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."incidents"
    ADD CONSTRAINT "incidents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_organization_id_email_key" UNIQUE ("organization_id", "email");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."maintenance_updates"
    ADD CONSTRAINT "maintenance_updates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."scheduled_maintenances"
    ADD CONSTRAINT "scheduled_maintenances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_status_logs"
    ADD CONSTRAINT "service_status_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."services_incidents"
    ADD CONSTRAINT "services_incidents_pkey" PRIMARY KEY ("service_id", "incident_id");



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."services_scheduled_maintenances"
    ADD CONSTRAINT "services_scheduled_maintenances_pkey" PRIMARY KEY ("service_id", "scheduled_maintenance_id");



ALTER TABLE ONLY "public"."uptime_daily_logs"
    ADD CONSTRAINT "uptime_daily_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."uptime_daily_logs"
    ADD CONSTRAINT "uptime_daily_logs_service_id_date_key" UNIQUE ("service_id", "date");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_incident_updates_incident_id" ON "public"."incident_updates" USING "btree" ("incident_id");



CREATE INDEX "idx_incidents_organization_id" ON "public"."incidents" USING "btree" ("organization_id");



CREATE INDEX "idx_maintenance_updates_scheduled_maintenance_id" ON "public"."maintenance_updates" USING "btree" ("scheduled_maintenance_id");



CREATE INDEX "idx_scheduled_maintenances_organization_id" ON "public"."scheduled_maintenances" USING "btree" ("organization_id");



CREATE INDEX "idx_service_status_logs_service_id" ON "public"."service_status_logs" USING "btree" ("service_id");



CREATE INDEX "idx_services_organization_id" ON "public"."services" USING "btree" ("organization_id");



CREATE INDEX "idx_uptime_daily_logs_service_id" ON "public"."uptime_daily_logs" USING "btree" ("service_id");



CREATE INDEX "idx_users_organization_id" ON "public"."users" USING "btree" ("organization_id");



ALTER TABLE ONLY "public"."incident_updates"
    ADD CONSTRAINT "incident_updates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."incident_updates"
    ADD CONSTRAINT "incident_updates_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "public"."incidents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."incidents"
    ADD CONSTRAINT "incidents_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."incidents"
    ADD CONSTRAINT "incidents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."maintenance_updates"
    ADD CONSTRAINT "maintenance_updates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."maintenance_updates"
    ADD CONSTRAINT "maintenance_updates_scheduled_maintenance_id_fkey" FOREIGN KEY ("scheduled_maintenance_id") REFERENCES "public"."scheduled_maintenances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."scheduled_maintenances"
    ADD CONSTRAINT "scheduled_maintenances_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."scheduled_maintenances"
    ADD CONSTRAINT "scheduled_maintenances_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."service_status_logs"
    ADD CONSTRAINT "service_status_logs_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."services_incidents"
    ADD CONSTRAINT "services_incidents_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "public"."incidents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."services_incidents"
    ADD CONSTRAINT "services_incidents_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."services_scheduled_maintenances"
    ADD CONSTRAINT "services_scheduled_maintenances_scheduled_maintenance_id_fkey" FOREIGN KEY ("scheduled_maintenance_id") REFERENCES "public"."scheduled_maintenances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."services_scheduled_maintenances"
    ADD CONSTRAINT "services_scheduled_maintenances_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."uptime_daily_logs"
    ADD CONSTRAINT "uptime_daily_logs_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";

--
-- Dumped schema changes for auth and storage
--

CREATE OR REPLACE TRIGGER "on_auth_user_created" AFTER INSERT ON "auth"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user"();




-- Add this to the end of your migration file

-- Rename columns
ALTER TABLE public.scheduled_maintenances
RENAME COLUMN scheduled_start_time TO start_time;

ALTER TABLE public.scheduled_maintenances
RENAME COLUMN scheduled_end_time TO end_time;

-- Drop columns
ALTER TABLE public.scheduled_maintenances
DROP COLUMN actual_start_time,
DROP COLUMN actual_end_time;
