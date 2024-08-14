import { ModelArgs } from "../../types";
import { ChatOpenAI } from "@langchain/openai";

export const MODELS = {

    'openai': (args?: ModelArgs) => new ChatOpenAI({
        modelName: args?.modelName || 'meta-llama/Meta-Llama-3.1-8B-Instruct',
        maxTokens: args?.maxOutputTokens || 12048,
        openAIApiKey: args?.apikey || "nerdKey",
        configuration: { baseURL: process.env.LLM_BASE_URL },
        ...args
    }),
}

