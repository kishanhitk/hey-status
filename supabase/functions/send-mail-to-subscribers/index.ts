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
    .select("title, description, organization_id, created_at")
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
    .select("name,slug")
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

  const statusColor =
    {
      investigating: "#FFA500", // Orange
      identified: "#4B0082", // Indigo
      monitoring: "#1E90FF", // Dodger Blue
      resolved: "#008000", // Green
    }[status] || "#000000"; // Default to black if status is not recognized

  const subject = `${status.toUpperCase()}: ${incident.title} - ${
    organization.name
  } Status Update`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f4f4f4; padding: 10px; text-align: center; }
        .content { padding: 20px 0; }
        .footer { background-color: #f4f4f4; padding: 10px; text-align: center; font-size: 0.8em; }
        .status { font-weight: bold; color: ${statusColor}; }
        .button { display: inline-block; padding: 10px 20px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${organization.name} Status Update</h1>
        </div>
        <div class="content">
          <h2>${incident.title}</h2>
          <p><strong>Status:</strong> <span class="status">${status.toUpperCase()}</span></p>
          <p><strong>Updated:</strong> ${new Date().toUTCString()}</p>
          <p><strong>Message:</strong> ${message}</p>
          <h3>Incident Details:</h3>
          <p><strong>Started:</strong> ${new Date(
            incident.created_at
          ).toUTCString()}</p>
          <p><strong>Description:</strong> ${incident.description}</p>
          <p>Our team is actively working on resolving this issue. We appreciate your patience and understanding.</p>
          <p>
            <a href="https://hey-status.pages.dev/${
              organization.slug
            }" class="button">View Status Page</a>
          </p>
        </div>
        <div class="footer">
          <p>You're receiving this email because you've subscribed to status updates for ${
            organization.name
          }.</p>
        </div>
      </div>
    </body>
    </html>
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
