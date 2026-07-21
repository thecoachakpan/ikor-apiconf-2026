import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const apiKey = Deno.env.get('MONNIFY_API_KEY')
  const contractCode = Deno.env.get('MONNIFY_CONTRACT_CODE')
  
  if (!apiKey || !contractCode) {
    return new Response(JSON.stringify({ error: 'Monnify API Key or Contract Code is missing in environment secrets' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const isSandbox = apiKey.startsWith("MK_TEST_")

  return new Response(JSON.stringify({ 
    apiKey, 
    contractCode,
    isSandbox 
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})
