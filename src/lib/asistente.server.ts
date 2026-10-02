import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const MODELO = "openai/gpt-6-astra";
const RUN_HEADER = "X-Lovable-AIG-Run-ID";

function runIdFetch() {
  let runId: string | undefined;
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    if (runId && !headers.has(RUN_HEADER)) headers.set(RUN_HEADER, runId);
    const res = await fetch(input, { ...init, headers });
    runId ??= res.headers.get(RUN_HEADER)?.trim() || undefined;
    return res;
  };
}

export class ErrorAsistente extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
}

export async function responderPregunta(system: string, prompt: string): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new ErrorAsistente("El asistente no está configurado.");
  const provider = createOpenAI({
    baseURL: GATEWAY,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch(),
  });
  let fallo: unknown = null;
  const result = streamText({
    model: provider.responses(MODELO),
    system,
    prompt,
    maxRetries: 0,
    onError: ({ error }) => {
      fallo = error;
    },
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  let texto = "";
  try {
    texto = await result.text;
  } catch (e) {
    fallo = fallo ?? e;
  }
  if (fallo || !texto.trim()) {
    const status = (fallo as { statusCode?: number } | null)?.statusCode;
    console.error("Asistente IA error", status, fallo);
    if (status === 402) throw new ErrorAsistente("Se agotaron los créditos de IA del espacio de trabajo.", 402);
    if (status === 429) throw new ErrorAsistente("Demasiadas preguntas seguidas. Espera un momento e intenta de nuevo.", 429);
    if (status === 403) throw new ErrorAsistente("El uso de IA no está permitido en este momento.", 403);
    throw new ErrorAsistente("El asistente no pudo responder. Intenta de nuevo más tarde.", status);
  }
  return texto.trim();
}
