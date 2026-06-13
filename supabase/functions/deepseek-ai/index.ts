import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";

function buildEmailPrompt(body: Record<string, string>): string {
  const { customerName, customerCountry, product, requirements, emailType, tone } = body;
  const typeInstructions: Record<string, string> = {
    reply_inquiry: "Reply to a customer inquiry professionally.",
    send_quote: "Send a quotation email with terms and conditions.",
    follow_up: "Professional follow-up email after no response.",
    introduce: "Introduce a product with unique selling points and CTA.",
    thank_you: "Thank customer for their order with confirmation details.",
  };
  const toneStyle: Record<string, string> = {
    professional: "Formal, respectful, sophisticated vocabulary.",
    friendly: "Warm, approachable while remaining professional.",
    concise: "Direct, succinct, short sentences, bullet points.",
  };
  return `You are a professional international trade email expert.
TASK: ${typeInstructions[emailType] || "Write a professional business email."}
STYLE: ${toneStyle[tone] || "Professional tone"}
CONTEXT: Customer: ${customerName || "the customer"}, Location: ${customerCountry || "International"}, Product: ${product}, Details: ${requirements}
FORMAT:
Subject: [subject line]
---
[email body 2-3 paragraphs, under 250 words]
---
Best regards,
[Signature Placeholder]
OUTPUT ONLY the formatted email.`;
}

function buildTranslatePrompt(body: Record<string, string>): string {
  const { text, fromLang, toLang } = body;
  return `You are a professional translator for foreign trade. Translate the following ${fromLang} text to ${toLang}. Output only the translated text.\n\n${text}`;
}

function buildAnalysisPrompt(body: Record<string, string>): string {
  const { email } = body;
  return `Analyze this customer email for purchase intent. Output pure JSON (no markdown):
{"intent_level":"high|medium|low","intent_score":0-100,"customer_type":"end_user|trader|distributor|pending","key_needs":[2-4 needs],"concerns":[1-3 concerns],"suggested_action":"next step","follow_up_template":"2-3 bullets"}
Email:\n${email}`;
}

function buildLinkedInPrompt(body: Record<string, string>): string {
  const { contactName, contactRole, company, industry, purpose } = body;
  return `Write a LinkedIn connection request (under 300 chars) and follow-up message. Output pure JSON:
{"connection_message":"<under 300 chars>","follow_up_message":"<1-2 paragraphs>"}
Contact: ${contactName || "prospect"}, ${contactRole || "professional"} at ${company || "company"} (${industry || "industry"}). Purpose: ${purpose || "Business collaboration"}`;
}

function buildWhatsAppPrompt(body: Record<string, string>): string {
  const { contactName, company, product, purpose } = body;
  return `Write a professional WhatsApp message template (under 500 chars). Output pure JSON:
{"message_template":"<concise message with greeting, value prop, CTA>"}
Contact: ${contactName || "prospect"} at ${company || "company"}. Product: ${product || "our products"}. Purpose: ${purpose || "Introduce and explore collaboration"}`;
}

function buildMarketResearchPrompt(body: Record<string, string>): string {
  const { topic, region, industry } = body;
  return `Analyze this market topic: "${topic}". ${region ? `Region: ${region}.` : ""} ${industry ? `Industry: ${industry}.` : ""}
Output pure JSON: {"summary":"2-3 paragraph summary","findings":[{"title":"","detail":"","significance":"high|medium|low"}x4-6],"data_sources":[{"name":"","url":"","accessed_at":"${new Date().toISOString().split("T")[0]}"}x2-3]}`;
}

function buildScoreOpportunityPrompt(body: Record<string, string>): string {
  const { dealTitle, company, value, stage, notes, contactInfo } = body;
  return `Score this sales opportunity. Output pure JSON:
{"score":0-100,"risk_level":"low|medium|high","factors":[{"name":"Deal Size","score":0-100,"weight":0.0-1.0},{"name":"Engagement Level","score":0-100,"weight":0.0-1.0},{"name":"Timeline Urgency","score":0-100,"weight":0.0-1.0},{"name":"Decision Maker Access","score":0-100,"weight":0.0-1.0},{"name":"Competition Risk","score":0-100,"weight":0.0-1.0},{"name":"Product Fit","score":0-100,"weight":0.0-1.0}],"recommendation":"2-3 sentence recommendation"}
Deal: ${dealTitle}, Company: ${company || "Unknown"}, Value: ${value || "Unknown"}, Stage: ${stage || "Unknown"}, Notes: ${notes || "None"}, Contact: ${contactInfo || "Unknown"}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY") || Deno.env.get("deepseek_v4_flash");
    if (!DEEPSEEK_API_KEY) {
      return new Response(JSON.stringify({ error: "DeepSeek API key not configured." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json() as Record<string, string>;
    const { task } = body;
    let userPrompt = "";

    if (task === "email") userPrompt = buildEmailPrompt(body);
    else if (task === "translate") userPrompt = buildTranslatePrompt(body);
    else if (task === "analyze_customer") userPrompt = buildAnalysisPrompt(body);
    else if (task === "linkedin_message") userPrompt = buildLinkedInPrompt(body);
    else if (task === "whatsapp_message") userPrompt = buildWhatsAppPrompt(body);
    else if (task === "market_research") userPrompt = buildMarketResearchPrompt(body);
    else if (task === "score_opportunity") userPrompt = buildScoreOpportunityPrompt(body);
    else return new Response(JSON.stringify({ error: "Unknown task." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const response = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${DEEPSEEK_API_KEY}` },
      body: JSON.stringify({
        model: Deno.env.get("DEEPSEEK_MODEL") || "deepseek-chat",
        messages: [
          { role: "system", content: "You are a helpful assistant for foreign trade professionals." },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 2048,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(JSON.stringify({ error: `DeepSeek API error: ${response.status}` }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json() as { choices: { message: { content: string } }[] };
    const content = data.choices?.[0]?.message?.content ?? "";
    return new Response(JSON.stringify({ content }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
