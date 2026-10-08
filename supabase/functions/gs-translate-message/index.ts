import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("TRANSLATION_ALLOWED_ORIGIN") || "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!auth || !supabaseUrl || !anonKey) {
      return Response.json({ error: "Authentication required" }, { status: 401, headers: corsHeaders });
    }
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: auth, apikey: anonKey },
    });
    if (!userResponse.ok) return Response.json({ error: "Invalid session" }, { status: 401, headers: corsHeaders });

    const { text, target_lang } = await req.json();
    if (typeof text !== "string" || !text.trim() || text.length > 5000) {
      return Response.json({ error: "Text must contain 1–5000 characters" }, { status: 400, headers: corsHeaders });
    }
    const target = target_lang === "EN" ? "EN" : target_lang === "ES" ? "ES" : null;
    if (!target) return Response.json({ error: "target_lang must be EN or ES" }, { status: 400, headers: corsHeaders });

    const apiKey = Deno.env.get("DEEPL_AUTH_KEY");
    if (!apiKey) return Response.json({ error: "Translation provider is not configured. Set DEEPL_AUTH_KEY in Edge Function secrets." }, { status: 503, headers: corsHeaders });

    const apiUrl = Deno.env.get("DEEPL_API_URL") || (apiKey.endsWith(":fx") ? "https://api-free.deepl.com/v2/translate" : "https://api.deepl.com/v2/translate");
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { Authorization: `DeepL-Auth-Key ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ text: [text.trim()], target_lang: target }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return Response.json({ error: "Translation provider request failed", provider_status: response.status }, { status: 502, headers: corsHeaders });
    const translatedText = result?.translations?.[0]?.text;
    if (typeof translatedText !== "string") return Response.json({ error: "No translation returned" }, { status: 502, headers: corsHeaders });
    return Response.json({ translatedText }, { headers: { ...corsHeaders, "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400, headers: corsHeaders });
  }
});