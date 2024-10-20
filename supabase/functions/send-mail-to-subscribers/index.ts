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
  console.log(to, subject, html);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Status Updates <updates@kishans.in>",
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to send email: ${response.statusText}`);
  }

  console.log("Email sent successfully");
  return response.json();
}

Deno.serve(async (req) => {
  const data = await req.json();
  console.log("data", data);
  const { organizationId, incidentId, updateId } = data;

  console.log("organizationId", organizationId);
  console.log("incidentId", incidentId);
  console.log("updateId", updateId);

  // Fetch organization details
  const { data: organization, error: orgError } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", organizationId)
    .single();

  if (orgError) {
    return new Response(JSON.stringify({ error: "Organization not found" }), {
      status: 404,
    });
  }

  // Fetch incident details
  const { data: incident, error: incidentError } = await supabase
    .from("incidents")
    .select("title, description")
    .eq("id", incidentId)
    .single();

  if (incidentError) {
    return new Response(JSON.stringify({ error: "Incident not found" }), {
      status: 404,
    });
  }

  // Fetch update details if updateId is provided
  let update = null;
  if (updateId) {
    const { data, error: updateError } = await supabase
      .from("incident_updates")
      .select("message, status")
      .eq("id", updateId)
      .single();

    if (updateError) {
      return new Response(JSON.stringify({ error: "Update not found" }), {
        status: 404,
      });
    }
    update = data;
  }

  // Fetch subscribers
  const { data: subscribers, error: subscribersError } = await supabase
    .from("subscribers")
    .select("email")
    .eq("organization_id", organizationId);

  if (subscribersError) {
    return new Response(
      JSON.stringify({ error: "Failed to fetch subscribers" }),
      { status: 500 }
    );
  }

  const to = subscribers.map((sub) => sub.email);

  const subject = update
    ? `Update: ${incident.title} - ${organization.name} Status`
    : `New Incident: ${incident.title} - ${organization.name} Status`;

  const html = update
    ? `
      <h1>Update: ${incident.title}</h1>
      <p><strong>Status:</strong> ${update.status}</p>
      <p>${update.message}</p>
      <p>Visit our status page for more information.</p>
    `
    : `
      <h1>New Incident: ${incident.title}</h1>
      <p>${incident.description}</p>
      <p>We are investigating this issue and will provide updates as they become available.</p>
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
    --data '{"organizationId":"Functions","incidentId":"Functions","updateId":"Functions"}'

*/
