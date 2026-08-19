import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  query: z.string().min(1).max(2000),
  context: z.string().min(1).max(20000),
});

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash";

export interface PipelineRun {
  answer: string;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
}

export interface PipelineResult {
  keptIndices: number[];
  compressedText: string;
  traditional: PipelineRun;
  optimized: PipelineRun;
}

function splitSentencesServer(text: string): string[] {
  return text
    .replace(/([.?!])\s+/g, "$1|")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function callGateway(
  apiKey: string,
  messages: Array<{ role: string; content: string }>,
): Promise<{ content: string; promptTokens: number; completionTokens: number }> {
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({ model: MODEL, messages }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("Rate limited by the AI gateway. Try again shortly.");
    if (res.status === 402)
      throw new Error("AI credits exhausted. Add credits in Lovable to keep compressing.");
    if (res.status === 403) throw new Error("AI access is blocked by workspace policy.");
    throw new Error(`AI gateway error ${res.status}: ${text.slice(0, 300)}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };

  return {
    content: json.choices?.[0]?.message?.content ?? "",
    promptTokens: json.usage?.prompt_tokens ?? 0,
    completionTokens: json.usage?.completion_tokens ?? 0,
  };
}

export const runCompressionPipeline = createServerFn({ method: "POST" })
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<PipelineResult> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured.");

    const sentences = splitSentencesServer(data.context);
    const numbered = sentences.map((s, i) => `[${i}] ${s}`).join("\n");

    // 1. Real LLM-driven sentence selection.
    const selection = await callGateway(apiKey, [
      {
        role: "system",
        content:
          "You compress retrieved RAG context. Given a user query and numbered sentences, return ONLY a JSON array of the indices of sentences that are semantically necessary to answer the query. Drop filler, hedging, transitions and redundancy. Keep roughly 30-50% of sentences. Respond with JSON only, e.g. [0,3,7].",
      },
      { role: "user", content: `Query: ${data.query}\n\nSentences:\n${numbered}` },
    ]);

    const match = selection.content.match(/\[[\s\S]*?\]/);
    let keptIndices: number[] = [];
    if (match) {
      try {
        const parsed: unknown = JSON.parse(match[0]);
        if (Array.isArray(parsed)) {
          keptIndices = parsed
            .map((n) => Number(n))
            .filter((n) => Number.isInteger(n) && n >= 0 && n < sentences.length);
        }
      } catch {
        keptIndices = [];
      }
    }
    if (keptIndices.length === 0) {
      keptIndices = sentences.map((_, i) => i).slice(0, Math.max(1, Math.ceil(sentences.length / 2)));
    }
    keptIndices = Array.from(new Set(keptIndices)).sort((a, b) => a - b);

    const compressedText = keptIndices.map((i) => sentences[i]).join(" ");

    const answerPrompt = (ctx: string) => [
      {
        role: "system",
        content:
          "Answer the user's question using ONLY the provided context. Be concise (max 4 sentences).",
      },
      { role: "user", content: `Context:\n${ctx}\n\nQuestion: ${data.query}` },
    ];

    // 2. Two real generations, timed independently.
    const timed = async (ctx: string): Promise<PipelineRun> => {
      const start = Date.now();
      const out = await callGateway(apiKey, answerPrompt(ctx));
      return {
        answer: out.content,
        latencyMs: Date.now() - start,
        promptTokens: out.promptTokens,
        completionTokens: out.completionTokens,
      };
    };

    const [traditional, optimized] = await Promise.all([
      timed(data.context),
      timed(compressedText),
    ]);

    return { keptIndices, compressedText, traditional, optimized };
  });
