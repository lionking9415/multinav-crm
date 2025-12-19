// Supabase Edge Function to send OTP emails via Resend
// Deploy with: supabase functions deploy send-otp-email

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

if (!RESEND_API_KEY) {
  console.error("[Edge Function] RESEND_API_KEY environment variable is not set");
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface OTPEmailRequest {
  email: string;
  otp: string;
  userName: string;
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, otp, userName }: OTPEmailRequest = await req.json();

    if (!email || !otp) {
      return new Response(
        JSON.stringify({ success: false, error: "Email and OTP are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Edge Function] Sending OTP email to: ${email}`);

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #22c55e; margin: 0;">🌿 MultiNav iCRM</h1>
          <p style="color: #666; margin-top: 5px;">Integrated Care Reporting & Management</p>
        </div>
        
        <div style="background: #f8fafc; border-radius: 10px; padding: 30px; text-align: center;">
          <h2 style="color: #1e293b; margin-top: 0;">Verify Your Login</h2>
          <p style="color: #64748b;">Hi ${userName || "User"},</p>
          <p style="color: #64748b;">We noticed you're logging in from a new device. Please use the verification code below:</p>
          
          <div style="background: #22c55e; color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 20px 40px; border-radius: 10px; margin: 30px 0; display: inline-block;">
            ${otp}
          </div>
          
          <p style="color: #94a3b8; font-size: 14px;">This code expires in <strong>10 minutes</strong>.</p>
        </div>
        
        <div style="margin-top: 30px; padding: 20px; background: #fef3c7; border-radius: 10px;">
          <p style="color: #92400e; margin: 0; font-size: 14px;">
            <strong>⚠️ Security Notice:</strong> If you didn't request this code, please ignore this email. 
            Someone may have entered your email address by mistake.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; color: #94a3b8; font-size: 12px;">
          <p>© ${new Date().getFullYear()} MultiNav iCRM. All rights reserved.</p>
        </div>
      </div>
    `;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "MultiNav iCRM <onboarding@resend.dev>",
        to: [email],
        subject: `Your MultiNav Login Code: ${otp}`,
        html: emailHtml,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("[Edge Function] Resend API error:", result);
      return new Response(
        JSON.stringify({ success: false, error: result.message || "Failed to send email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[Edge Function] Email sent successfully:", result.id);

    return new Response(
      JSON.stringify({ success: true, messageId: result.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Edge Function] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

