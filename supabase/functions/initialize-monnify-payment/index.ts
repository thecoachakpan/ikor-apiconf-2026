import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { amount, customerEmail, customerName, reference, paymentReference, paymentDescription } = body
    const finalRef = paymentReference || reference

    const apiKey = Deno.env.get('MONNIFY_API_KEY')
    const secretKey = Deno.env.get('MONNIFY_SECRET_KEY')
    const contractCode = Deno.env.get('MONNIFY_CONTRACT_CODE')

    if (!apiKey || !secretKey || !contractCode) {
      return new Response(JSON.stringify({ error: 'Monnify configuration is incomplete on the server.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Autodetect sandbox mode from the API Key
    const isSandbox = apiKey.startsWith("MK_TEST_")
    const baseUrl = isSandbox ? "https://sandbox.monnify.com" : "https://api.monnify.com"

    // 1. Authenticate with Monnify to get a Bearer token
    const basicAuth = btoa(`${apiKey}:${secretKey}`)
    const loginResponse = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basicAuth}`,
        "Content-Type": "application/json"
      }
    })

    if (!loginResponse.ok) {
      const loginErr = await loginResponse.text()
      console.error("Monnify auth login failed:", loginErr)
      return new Response(JSON.stringify({ error: "Failed to authenticate with Monnify" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const loginData = await loginResponse.json()
    const accessToken = loginData.responseBody?.accessToken

    if (!accessToken) {
      return new Response(JSON.stringify({ error: "No access token received from Monnify" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 2. Initialize Transaction
    const initResponse = await fetch(`${baseUrl}/api/v1/merchant/transactions/init-transaction`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount,
        customerName: customerName || "Ikor User",
        customerEmail: customerEmail || "user@example.com",
        paymentReference: finalRef,
        paymentDescription: paymentDescription || "Ikor Word Top-up",
        currencyCode: "NGN",
        contractCode,
        redirectUrl: "https://sayikor.vercel.app/payment-success" // Redirect page on your Vercel domain
      })
    })

    if (!initResponse.ok) {
      const initErr = await initResponse.text()
      console.error("Monnify init-transaction failed:", initErr)
      return new Response(JSON.stringify({ error: "Failed to initialize Monnify transaction" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const initData = await initResponse.json()
    const { checkoutUrl, transactionReference } = initData.responseBody || {}

    return new Response(JSON.stringify({ 
      checkoutUrl, 
      transactionReference,
      isSandbox
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error("Initialize transaction error:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
