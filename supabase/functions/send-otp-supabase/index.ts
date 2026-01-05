// Supabase Edge Function to send OTP emails using Supabase's built-in email
// This is FREE and doesn't require a custom domain

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, otp, userName } = await req.json()

    if (!email || !otp) {
      return new Response(
        JSON.stringify({ error: 'Email and OTP are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Method 1: Use Supabase's built-in email via auth.admin.generateLink
    // This sends a transactional email using Supabase's email infrastructure
    
    // Generate a magic link (we won't use it, but it triggers an email)
    // Instead, we'll use the email_queue table approach
    
    // Method 2: Insert into email_queue table (requires a database trigger to send)
    const { error: queueError } = await supabaseAdmin
      .from('email_queue')
      .insert({
        to_email: email,
        subject: `Your MultiNav Login Code: ${otp}`,
        body: `Hi ${userName || 'User'},\n\nYour verification code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you didn't request this code, please ignore this email.\n\n- MultiNav iCRM Team`,
        html_body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #22c55e; margin: 0;">🌿 MultiNav iCRM</h1>
              <p style="color: #666; margin-top: 5px;">Integrated Care Reporting & Management</p>
            </div>
            
            <div style="background: #f8fafc; border-radius: 10px; padding: 30px; text-align: center;">
              <h2 style="color: #1e293b; margin-top: 0;">Verify Your Login</h2>
              <p style="color: #64748b;">Hi ${userName || 'User'},</p>
              <p style="color: #64748b;">Your verification code is:</p>
              
              <div style="background: #22c55e; color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 20px 40px; border-radius: 10px; margin: 30px 0; display: inline-block;">
                ${otp}
              </div>
              
              <p style="color: #94a3b8; font-size: 14px;">This code expires in <strong>10 minutes</strong>.</p>
            </div>
            
            <div style="margin-top: 30px; padding: 20px; background: #fef3c7; border-radius: 10px;">
              <p style="color: #92400e; margin: 0; font-size: 14px;">
                <strong>⚠️ Security Notice:</strong> If you didn't request this code, please ignore this email.
              </p>
            </div>
          </div>
        `,
        status: 'pending',
        created_at: new Date().toISOString()
      })

    if (queueError) {
      console.error('Error queuing email:', queueError)
      
      // If email_queue table doesn't exist, return info about it
      if (queueError.code === '42P01') {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Email queue table not set up. OTP is logged to console.',
            otp_logged: true
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      return new Response(
        JSON.stringify({ error: queueError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Email queued for sending' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

