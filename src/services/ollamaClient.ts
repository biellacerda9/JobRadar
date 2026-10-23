const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "qwen2.5:7b-instruct";
// Ollama's runtime default is 4096 tokens and it silently truncates the start of
// the input (our system prompt) when exceeded. 8192 fits a long resume + job
// description + response.
const OLLAMA_NUM_CTX = 8192;

export class OllamaRequestError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "OllamaRequestError";
  }
}

/**
 * Sends a system+user chat message to the local Ollama instance asking for JSON
 * output, and returns the parsed JSON. Throws OllamaRequestError on transport
 * failure or malformed/missing content — callers decide how to retry/validate the
 * parsed shape against their own schema.
 */
export async function chatJson(
  systemPrompt: string,
  userContent: string,
): Promise<unknown> {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      format: "json",
      stream: false,
      options: { num_ctx: OLLAMA_NUM_CTX },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!response.ok) {
    throw new OllamaRequestError(
      `Ollama request failed with status ${response.status}`,
    );
  }

  const data = (await response.json()) as { message?: { content?: string } };
  const content = data.message?.content;

  if (!content) {
    throw new OllamaRequestError("Ollama returned no content");
  }

  try {
    return JSON.parse(content);
  } catch (error) {
    throw new OllamaRequestError("Ollama returned invalid JSON", {
      cause: error,
    });
  }
}
