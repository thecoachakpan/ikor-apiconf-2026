import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const transactionReference = body.transactionReference || body.eventData?.transactionReference
    
    if (!transactionReference) {
      return new Response(JSON.stringify({ verified: false, error: 'Transaction reference is missing' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const apiKey = Deno.env.get('MONNIFY_API_KEY')
    const secretKey = Deno.env.get('MONNIFY_SECRET_KEY')

    if (!apiKey || !secretKey) {
      return new Response(JSON.stringify({ error: 'Monnify configuration is incomplete on the server.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const isSandbox = apiKey.startsWith("MK_TEST_")
    const baseUrl = isSandbox ? "https://sandbox.monnify.com" : "https://api.monnify.com"

    // 1. Authenticate to get a Bearer token
    const basicAuth = btoa(`${apiKey}:${secretKey}`)
    const loginResponse = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basicAuth}`,
        "Content-Type": "application/json"
      }
    })

    if (!loginResponse.ok) {
      console.error("Monnify verification auth failed")
      return new Response(JSON.stringify({ verified: false, error: "Authentication failed with Monnify" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const loginData = await loginResponse.json()
    const accessToken = loginData.responseBody?.accessToken

    if (!accessToken) {
      return new Response(JSON.stringify({ verified: false, error: "No access token" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 2. Query transaction status
    const statusResponse = await fetch(`${baseUrl}/api/v2/transactions/${encodeURIComponent(transactionReference)}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`
      }
    })

    if (!statusResponse.ok) {
      const statusErr = await statusResponse.text()
      console.error("Failed to query transaction status:", statusErr)
      return new Response(JSON.stringify({ verified: false, error: "Failed to verify transaction status" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const statusData = await statusResponse.json()
    const paymentStatus = statusData.responseBody?.paymentStatus

    // Check if status is PAID or SUCCESS
    const verified = paymentStatus === "PAID" || paymentStatus === "SUCCESS"

    return new Response(JSON.stringify({ 
      verified,
      paymentStatus,
      amount: statusData.responseBody?.amount,
      transactionReference
    }), {
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
