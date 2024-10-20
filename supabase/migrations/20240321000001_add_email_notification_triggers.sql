create trigger "notify_subscribers_new_incident_update" after insert
on "public"."incident_updates" for each row
execute function "supabase_functions"."http_request"(
  'http://host.docker.internal:54321/functions/v1/send-mail-to-subscribers',
  'POST',
  '{"Content-Type":"application/json"}',
  '{}',
  '1000'
);
