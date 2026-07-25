import OpenAI from "openai";

export function getClaudeClient() {
  const apiKey = process.env.LITELLM_API_KEY;
  const baseURL = process.env.LITELLM_BASE_URL;
  const model = process.env.LITELLM_MODEL;

  if (!apiKey || !baseURL || !model) {
    throw new Error("LiteLLM configuration is incomplete.");
  }

  return {
    client: new OpenAI({
      apiKey,
      baseURL,
    }),
    model,
  };
}
