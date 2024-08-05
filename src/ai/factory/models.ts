import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ModelArgs } from "../../types";
import { ChatOpenAI } from "@langchain/openai";
import { ChatCloudflareWorkersAI } from "@langchain/cloudflare"

export const MODELS = {
    'gemini': (args?: ModelArgs) => new ChatGoogleGenerativeAI({
        modelName: args?.modelName || 'gemini-pro',
        maxOutputTokens: args?.maxOutputTokens || 2048,
        apiKey: args?.apikey || process.env.GOOGLE_API_KEY,
        ...args
    }),
    'openai': (args?: ModelArgs) => new ChatOpenAI({
        modelName: args?.modelName || 'meta-llama/Meta-Llama-3.1-8B-Instruct',
        maxTokens: args?.maxOutputTokens || 2048,
        openAIApiKey: args?.apikey || "nerdKey",
        configuration: { baseURL: "http://provider.a6000.mon.obl.akash.pub:31301/v1" },
        ...args
    }),
    'cloudflare': (args?: ModelArgs) => new ChatCloudflareWorkersAI({
        model: args?.modelName || 'llama-2-7b-chat-fp16',
        cloudflareAccountId: args?.cloudflareAccountId || process.env.CLOUDFLARE_ACCOUNT_ID,
        cloudflareApiToken: args?.cloudflareApiToken || process.env.CLOUDFLARE_API_TOKEN,
        ...args
    })
}
