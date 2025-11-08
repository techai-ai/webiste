import type { APIRoute } from "astro";

// This endpoint must run on the server at runtime
export const prerender = false;

type Body = {
  question?: string;
  dialect?: string;
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const { question, dialect }: Body = await request.json().catch(() => ({} as Body));
    if (!question || !question.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing 'question'" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiKey = import.meta.env.OPENAI_API_KEY as string | undefined;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Server missing OPENAI_API_KEY" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const primaryModel = "gpt-4o-mini";
    const fallbackModel = "gpt-3.5-turbo";
    const target = (dialect || "BigQuery").trim();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    async function call(model: string) {
      return fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content:
                "You output only valid SQL in one block. No explanations, no markdown, no backticks. Prefer safe, read-only queries.",
            },
            {
              role: "user",
              content: `Dialect: ${target}. Generate SQL for: ${question}`,
            },
          ],
        }),
        signal: controller.signal,
      });
    }

    let res = await call(primaryModel);
    if (!res.ok && (res.status === 400 || res.status === 404)) {
      res = await call(fallbackModel);
    }

    clearTimeout(timeout);

    if (!res.ok) {
      const msg = await res.text();
      return new Response(
        JSON.stringify({ success: false, error: `Upstream error: ${res.status} ${msg}` }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = (await res.json()) as any;
    const raw = data?.choices?.[0]?.message?.content ?? "";
    const sql = String(raw)
      .replace(/^```[a-zA-Z]*\n?|```$/g, "")
      .trim();

    return new Response(JSON.stringify({ success: true, sql }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    const message = err?.name === "AbortError" ? "Request timed out" : err?.message || "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
