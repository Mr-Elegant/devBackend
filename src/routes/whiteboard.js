import express from "express";

const whiteboardRouter = express.Router();

// 100% Free models available on OpenRouter
const FREE_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemini-2.0-flash-exp:free",
  "qwen/qwen-2.5-72b-instruct:free",
  "mistralai/mistral-small-24b-instruct-2501:free",
];

// Rich fallback templates for instant generation or offline mode
const ARCHITECTURE_TEMPLATES = {
  "url shortener": [
    { type: "rect", x: 100, y: 150, w: 170, h: 80, color: "#06b6d4", filled: true, text: "Client / Browser" },
    { type: "arrow", startX: 270, startY: 190, endX: 360, endY: 190, color: "#38bdf8", text: "POST /shorten" },
    { type: "rect", x: 360, y: 150, w: 180, h: 80, color: "#06b6d4", filled: true, text: "API Gateway\n(Rate Limiter)" },
    { type: "arrow", startX: 540, startY: 190, endX: 630, endY: 190, color: "#38bdf8", text: "Forward Req" },
    { type: "rect", x: 630, y: 150, w: 180, h: 80, color: "#06b6d4", filled: true, text: "URL Service\n(Base62 Encoder)" },
    { type: "arrow", startX: 720, startY: 230, endX: 720, endY: 330, color: "#10b981", text: "Cache Check" },
    { type: "circle", x: 720, y: 370, radius: 42, color: "#f59e0b", filled: true, text: "Redis Cache" },
    { type: "arrow", startX: 810, startY: 190, endX: 900, endY: 190, color: "#10b981", text: "Cache Miss" },
    { type: "cylinder", x: 900, y: 140, w: 150, h: 100, color: "#10b981", filled: true, text: "PostgreSQL DB\n(Shortlinks)" },
    { type: "sticky", x: 100, y: 280, w: 200, h: 140, text: "URL Shortener Specs:\n• Base62 hashing\n• 301 vs 302 redirects\n• 10M writes / day\n• 100M reads / day", bgColor: "#fef3c7", textColor: "#78350f" },
  ],
  "e-commerce": [
    { type: "rect", x: 80, y: 160, w: 170, h: 80, color: "#06b6d4", filled: true, text: "Web / Mobile App" },
    { type: "arrow", startX: 250, startY: 200, endX: 330, endY: 200, color: "#38bdf8", text: "HTTPS / GraphQL" },
    { type: "rect", x: 330, y: 160, w: 180, h: 80, color: "#06b6d4", filled: true, text: "API Gateway\n(Reverse Proxy)" },
    { type: "arrow", startX: 510, startY: 180, endX: 600, endY: 120, color: "#38bdf8", text: "Order RPC" },
    { type: "rect", x: 600, y: 80, w: 180, h: 80, color: "#06b6d4", filled: true, text: "Order Service" },
    { type: "arrow", startX: 780, startY: 120, endX: 860, endY: 120, color: "#10b981", text: "Read/Write" },
    { type: "cylinder", x: 860, y: 70, w: 140, h: 95, color: "#10b981", filled: true, text: "Orders DB\n(PostgreSQL)" },
    { type: "arrow", startX: 690, startY: 160, endX: 690, endY: 260, color: "#a855f7", text: "OrderCreated Event" },
    { type: "circle", x: 690, y: 300, radius: 44, color: "#a855f7", filled: true, text: "Kafka Topic\n(orders.v1)" },
    { type: "arrow", startX: 734, startY: 300, endX: 860, endY: 300, color: "#a855f7", text: "Consume" },
    { type: "rect", x: 860, y: 260, w: 180, h: 80, color: "#06b6d4", filled: true, text: "Payment Worker\n(Stripe Webhook)" },
    { type: "sticky", x: 80, y: 290, w: 200, h: 140, text: "E-Commerce Notes:\n• Event-driven architecture\n• Saga pattern for payments\n• Inventory reservation lock", bgColor: "#cffafe", textColor: "#164e63" },
  ],
  "chat": [
    { type: "rect", x: 80, y: 160, w: 170, h: 80, color: "#06b6d4", filled: true, text: "Chat Clients\n(React Web / iOS)" },
    { type: "arrow", startX: 250, startY: 200, endX: 340, endY: 200, color: "#38bdf8", text: "WSS Connection" },
    { type: "rect", x: 340, y: 160, w: 190, h: 80, color: "#06b6d4", filled: true, text: "Load Balancer\n(Sticky Sessions)" },
    { type: "arrow", startX: 530, startY: 200, endX: 620, endY: 200, color: "#38bdf8", text: "WebSockets" },
    { type: "rect", x: 620, y: 160, w: 180, h: 80, color: "#06b6d4", filled: true, text: "Chat Service Nodes\n(Socket.IO Cluster)" },
    { type: "arrow", startX: 710, startY: 240, endX: 710, endY: 340, color: "#f59e0b", text: "Pub/Sub Sync" },
    { type: "circle", x: 710, y: 380, radius: 44, color: "#f59e0b", filled: true, text: "Redis Pub/Sub\n(Adapter)" },
    { type: "arrow", startX: 800, startY: 200, endX: 890, endY: 200, color: "#10b981", text: "Async Batching" },
    { type: "cylinder", x: 890, y: 150, w: 150, h: 100, color: "#10b981", filled: true, text: "MongoDB / ScyllaDB\n(Messages Store)" },
    { type: "sticky", x: 80, y: 290, w: 200, h: 130, text: "Chat System Specs:\n• Bidirectional WebSockets\n• Redis distributed pub/sub\n• Offline message queue", bgColor: "#d1fae5", textColor: "#064e3b" },
  ],
  "analytics": [
    { type: "rect", x: 80, y: 160, w: 170, h: 80, color: "#06b6d4", filled: true, text: "Event Producer\n(Client Tracking SDK)" },
    { type: "arrow", startX: 250, startY: 200, endX: 340, endY: 200, color: "#38bdf8", text: "HTTP POST /events" },
    { type: "rect", x: 340, y: 160, w: 180, h: 80, color: "#06b6d4", filled: true, text: "Event Ingestion API\n(FastAPI / Go)" },
    { type: "arrow", startX: 520, startY: 200, endX: 610, endY: 200, color: "#a855f7", text: "Batch Produce" },
    { type: "circle", x: 650, y: 200, radius: 45, color: "#a855f7", filled: true, text: "Kafka Cluster\n(raw_events)" },
    { type: "arrow", startX: 695, startY: 200, endX: 790, endY: 200, color: "#a855f7", text: "Stream Process" },
    { type: "rect", x: 790, y: 160, w: 180, h: 80, color: "#06b6d4", filled: true, text: "Flink / Spark Worker\n(Window Aggregations)" },
    { type: "arrow", startX: 970, startY: 200, endX: 1050, endY: 200, color: "#10b981", text: "Columnar Write" },
    { type: "cylinder", x: 1050, y: 150, w: 160, h: 100, color: "#10b981", filled: true, text: "ClickHouse OLAP\n(Analytics DB)" },
    { type: "sticky", x: 80, y: 290, w: 200, h: 130, text: "Pipeline Metrics:\n• 50,000 events/sec\n• P99 ingestion < 200ms\n• Real-time Grafana dashboard", bgColor: "#ffe4e6", textColor: "#881337" },
  ],
};

const SYSTEM_PROMPT = `You are DevNet AI Architect, an expert software systems designer.
Given a user's architectural request, generate a clear, well-spaced 2D architecture diagram for an engineering canvas.

You MUST respond ONLY with a valid JSON object matching this exact format:
{
  "summary": "Short 1-line description of the architecture",
  "elements": [
    {
      "type": "rect",
      "x": 100,
      "y": 150,
      "w": 180,
      "h": 80,
      "color": "#06b6d4",
      "filled": true,
      "text": "Service Name"
    },
    {
      "type": "cylinder",
      "x": 600,
      "y": 140,
      "w": 150,
      "h": 100,
      "color": "#10b981",
      "filled": true,
      "text": "Database Name"
    },
    {
      "type": "circle",
      "x": 400,
      "y": 190,
      "radius": 42,
      "color": "#f59e0b",
      "filled": true,
      "text": "Queue / Cache Name"
    },
    {
      "type": "arrow",
      "startX": 280,
      "startY": 190,
      "endX": 360,
      "endY": 190,
      "color": "#38bdf8",
      "text": "API Call / Event"
    },
    {
      "type": "sticky",
      "x": 100,
      "y": 280,
      "w": 200,
      "h": 130,
      "text": "Architectural Notes\\n• Bullet 1\\n• Bullet 2",
      "bgColor": "#fef3c7",
      "textColor": "#78350f"
    }
  ]
}

CRITICAL RULES:
1. Coordinate Spacing:
   - Layout components left-to-right (data flow pipeline) or tier-by-tier (Clients -> Gateways -> Services -> DB/Queues).
   - Minimum horizontal spacing between nodes: 80px to 140px so arrows fit cleanly.
   - For arrows, ensure startX/startY connects from the right edge or bottom edge of the source node to the left edge or top edge of the destination node.
2. Element Types:
   - "rect": Standard services, microservices, API gateways, clients, workers.
   - "cylinder": Databases, storage engines, persistent stores (PostgreSQL, MongoDB, MySQL, Cassandra).
   - "circle": Caches, message queues, event buses (Redis, Kafka, RabbitMQ).
   - "arrow": Connections between components with optional flow label text.
   - "sticky": Architecture requirements, SLA, throughput notes.
3. Colors:
   - Use vibrant developer hex codes: "#06b6d4" (Cyan), "#10b981" (Emerald/DB), "#f59e0b" (Amber/Cache), "#a855f7" (Purple/Queue), "#f43f5e" (Rose/Auth).
4. Output JSON ONLY. Zero conversational filler, zero markdown code blocks.`;

/**
 * Helper to query OpenRouter using free models with fallback chain
 */
async function callOpenRouterWithFallback({ prompt, apiKey }) {
  let lastError = null;

  for (const model of FREE_MODELS) {
    try {
      console.log(`[AI Architect] Attempting generation with model: ${model}`);
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://devnet.co.in",
          "X-Title": "DevNet Architecture Whiteboard",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: `Generate architecture diagram for: ${prompt}` },
          ],
          temperature: 0.2,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[AI Architect] Model ${model} failed (${response.status}):`, errorText);
        lastError = new Error(`OpenRouter ${response.status}: ${errorText}`);
        continue; // Try next free model in chain
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        continue;
      }

      // Parse JSON from output (stripping any accidental markdown wrapping)
      let cleanJson = content.trim();
      if (cleanJson.startsWith("```")) {
        cleanJson = cleanJson.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }

      const parsed = JSON.parse(cleanJson);
      if (parsed && Array.isArray(parsed.elements) && parsed.elements.length > 0) {
        return {
          modelUsed: model,
          summary: parsed.summary || "System Architecture Diagram",
          elements: parsed.elements,
        };
      }
    } catch (err) {
      console.warn(`[AI Architect] Error with ${model}:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error("All free OpenRouter models were busy or rate-limited.");
}

/**
 * POST /whiteboard/ai-generate
 */
whiteboardRouter.post("/whiteboard/ai-generate", async (req, res) => {
  try {
    const { prompt, userApiKey, offsetX = 100, offsetY = 120 } = req.body;

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const apiKey = userApiKey || process.env.OPENROUTER_API_KEY;

    // Check if prompt matches quick architectural templates
    const lowerPrompt = prompt.toLowerCase();
    let templateKey = null;
    if (lowerPrompt.includes("shortener") || lowerPrompt.includes("url")) {
      templateKey = "url shortener";
    } else if (lowerPrompt.includes("e-commerce") || lowerPrompt.includes("shop") || lowerPrompt.includes("order")) {
      templateKey = "e-commerce";
    } else if (lowerPrompt.includes("chat") || lowerPrompt.includes("messaging") || lowerPrompt.includes("socket")) {
      templateKey = "chat";
    } else if (lowerPrompt.includes("analytics") || lowerPrompt.includes("pipeline") || lowerPrompt.includes("stream")) {
      templateKey = "analytics";
    }

    // If no API key is set yet, return the instant template match or inform client
    if (!apiKey) {
      if (templateKey && ARCHITECTURE_TEMPLATES[templateKey]) {
        const raw = ARCHITECTURE_TEMPLATES[templateKey];
        // Apply offset to match user's current canvas viewport
        const shifted = raw.map((el, idx) => ({
          ...el,
          id: `ai_${Date.now()}_${idx}`,
          x: el.x !== undefined ? el.x + offsetX : undefined,
          y: el.y !== undefined ? el.y + offsetY : undefined,
          startX: el.startX !== undefined ? el.startX + offsetX : undefined,
          startY: el.startY !== undefined ? el.startY + offsetY : undefined,
          endX: el.endX !== undefined ? el.endX + offsetX : undefined,
          endY: el.endY !== undefined ? el.endY + offsetY : undefined,
        }));
        return res.json({
          success: true,
          modelUsed: "DevNet Instant Architectural Engine",
          summary: `High-Availability ${templateKey.toUpperCase()} Architecture`,
          elements: shifted,
        });
      }

      return res.status(400).json({
        error: "OPENROUTER_API_KEY_REQUIRED",
        message:
          "Please configure OPENROUTER_API_KEY in backend .env or provide your free OpenRouter API key in the AI Architect settings.",
      });
    }

    // Call free OpenRouter models with fallback
    try {
      const result = await callOpenRouterWithFallback({ prompt, apiKey });
      // Generate unique IDs and apply canvas offset
      const shifted = result.elements.map((el, idx) => ({
        ...el,
        id: `ai_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
        x: el.x !== undefined ? el.x + offsetX : undefined,
        y: el.y !== undefined ? el.y + offsetY : undefined,
        startX: el.startX !== undefined ? el.startX + offsetX : undefined,
        startY: el.startY !== undefined ? el.startY + offsetY : undefined,
        endX: el.endX !== undefined ? el.endX + offsetX : undefined,
        endY: el.endY !== undefined ? el.endY + offsetY : undefined,
      }));

      return res.json({
        success: true,
        modelUsed: result.modelUsed,
        summary: result.summary,
        elements: shifted,
      });
    } catch (llmErr) {
      console.warn("[AI Architect] LLM call failed, falling back to template if applicable:", llmErr.message);
      if (templateKey && ARCHITECTURE_TEMPLATES[templateKey]) {
        const raw = ARCHITECTURE_TEMPLATES[templateKey];
        const shifted = raw.map((el, idx) => ({
          ...el,
          id: `ai_${Date.now()}_${idx}`,
          x: el.x !== undefined ? el.x + offsetX : undefined,
          y: el.y !== undefined ? el.y + offsetY : undefined,
          startX: el.startX !== undefined ? el.startX + offsetX : undefined,
          startY: el.startY !== undefined ? el.startY + offsetY : undefined,
          endX: el.endX !== undefined ? el.endX + offsetX : undefined,
          endY: el.endY !== undefined ? el.endY + offsetY : undefined,
        }));
        return res.json({
          success: true,
          modelUsed: "DevNet Architecture Engine (Fallback)",
          summary: `System Architecture for: ${prompt}`,
          elements: shifted,
        });
      }
      return res.status(502).json({
        error: "LLM_GENERATION_FAILED",
        message: "Free models are currently experiencing high demand. Please try again in a moment or use one of the quick template chips.",
      });
    }
  } catch (err) {
    console.error("[AI Architect] Server error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default whiteboardRouter;
