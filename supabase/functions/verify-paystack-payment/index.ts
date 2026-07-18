import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { reference, wordsAdded, upgradedPlanName } = await req.json()
    const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY')
    if (!paystackSecret) {
      throw new Error("Missing PAYSTACK_SECRET_KEY in environment secrets")
    }

    // Verify transaction with Paystack
    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
      }
    })
    
    if (!res.ok) {
      const errText = await res.text()
      console.error("Paystack API call failed:", errText)
      return new Response(JSON.stringify({ verified: false, error: 'Failed to verify transaction with Paystack API' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const paystackData = await res.json()
    if (!paystackData.status || paystackData.data.status !== 'success') {
      return new Response(JSON.stringify({ verified: false, error: 'Transaction status is not successful' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Connect to Supabase Auth Admin API using SERVICE_ROLE_KEY
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Extract user ID from Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ verified: false, error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token)
    if (authErr || !user) {
      console.error("Failed to authenticate token:", authErr)
      return new Response(JSON.stringify({ verified: false, error: 'Unauthorized token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Calculate new balance
    const currentMetadata = user.user_metadata || {}
    const currentBalance = typeof currentMetadata.user_words_balance === 'number' ? currentMetadata.user_words_balance : 900
    const newWordsVal = currentBalance + (wordsAdded || 0)

    // Update user auth metadata
    const updateData: any = {
      ...currentMetadata,
      user_words_balance: newWordsVal,
    }
    if (upgradedPlanName) {
      updateData.plan_name = upgradedPlanName
      updateData.trial_start_date = new Date().toISOString()
    }

    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: updateData
    })

    if (updateErr) {
      console.error("Failed to update user auth metadata:", updateErr)
      return new Response(JSON.stringify({ verified: false, error: updateErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ verified: true, new_balance: newWordsVal }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error: any) {
    console.error("Verify edge function error:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
