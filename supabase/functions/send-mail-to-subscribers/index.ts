// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function sendEmail(to: string[], subject: string, html: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Status Updates <notify@updates.kishans.in>",
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to send email: ${response.statusText}`);
  }

  return response.json();
}

Deno.serve(async (req) => {
  const data = await req.json();

  // Only handle inserts into incident_updates table
  if (data.type !== "INSERT" || data.table !== "incident_updates") {
    return new Response(JSON.stringify({ message: "Ignored" }), {
      status: 200,
    });
  }

  const { record } = data;
  const { incident_id, status, message } = record;

  // Fetch incident details
  const { data: incident, error: incidentError } = await supabase
    .from("incidents")
    .select("title, description, organization_id")
    .eq("id", incident_id)
    .single();

  if (incidentError) {
    return new Response(JSON.stringify({ error: "Incident not found" }), {
      status: 404,
    });
  }

  // Fetch organization details
  const { data: organization, error: orgError } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", incident.organization_id)
    .single();

  if (orgError) {
    return new Response(JSON.stringify({ error: "Organization not found" }), {
      status: 404,
    });
  }

  // Fetch subscribers
  const { data: subscribers, error: subscribersError } = await supabase
    .from("subscribers")
    .select("email")
    .eq("organization_id", incident.organization_id);

  if (subscribersError) {
    return new Response(
      JSON.stringify({ error: "Failed to fetch subscribers" }),
      { status: 500 }
    );
  }

  const to = subscribers.map((sub) => sub.email);

  const subject = `Update: ${incident.title} - ${organization.name} Status`;

  const html = `
    <h1>Update: ${incident.title}</h1>
    <p><strong>Status:</strong> ${status}</p>
    <p>${message}</p>
    <p>Visit our status page for more information.</p>
  `;

  try {
    await sendEmail(to, subject, html);
    return new Response(
      JSON.stringify({ message: "Emails sent successfully" }),
      { status: 200 }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/send-mail-to-subscribers' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"type":"INSERT","table":"incident_updates","record":{"id":"6200d2d9-0140-4c05-94e5-c8814c948f6f","status":"investigating","message":"asd as ","created_at":"2024-10-20T14:29:54.32579+00:00","created_by":"4a6e50b3-994f-4107-922f-f04f1be712d5","incident_id":"249c64a1-3194-48d9-8683-5b23dcd334f2"},"schema":"public","old_record":null}'

*/
