create trigger "notify_subscribers_new_incident_update_prod" after insert
on "public"."incident_updates" for each row
execute function "supabase_functions"."http_request"(
  'https://kwuyxwlvccmfsnyojdip.supabase.co/functions/v1/send-mail-to-subscribers',
  'POST',
  '{"Content-Type":"application/json"}',
  '{}',
  '1000'
);
