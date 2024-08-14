import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { AiModel, InvokeParams, ModelArgs, ModelName } from "../../types";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { SYSTEM_STRUCT, PROMT } from "../prompts";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import z, { ZodType, ZodTypeDef } from "zod"
import { MODELS } from "./models";

export default class FactoryModel {
    model: BaseChatModel
    constructor(private ai?: AiModel) {

        this.initModel(ai)
    }

    get instance() {
        if (this.ai instanceof BaseChatModel) {
            return this.ai.getName()
        }

        return this.ai?.modelName || 'openai'
    }

    protected createTemplateMessage(invokeParams: InvokeParams) {

        const question = new HumanMessage({
            content: [
                {
                    type: "text",
                    text: invokeParams.question
                },
            ]
        })

        const system = SYSTEM_STRUCT
            .replace('{question}', invokeParams.question)
            .replace('{history}', JSON.stringify(invokeParams.history))
            .replace('{persona}', invokeParams?.persona || 'A chill dude')
            .replace('{format_instructions}', invokeParams?.format_instructions || '')



        const template = new SystemMessage({
            content: system,
            name: 'system',
        })

        return [template].concat(question)

    }

    async createStructure<T>(invokeParams: InvokeParams, llmStructuredOutputTool: ZodType<T, ZodTypeDef, T>) {
        if (this.model?.withStructuredOutput) {
            return await PROMT
                .pipe(this.model.withStructuredOutput(llmStructuredOutputTool))
                .invoke(invokeParams) as z.infer<typeof llmStructuredOutputTool>;
        }

        return await this.model
            .pipe(
                new JsonOutputParser()
            )
            .invoke(this.createTemplateMessage(invokeParams)) as z.infer<typeof llmStructuredOutputTool>;

    }


    private initModel(aiModel: AiModel) {

        if (aiModel instanceof BaseChatModel) {
            this.model = aiModel as BaseChatModel
            return
        } else {
            aiModel ||= { modelName: 'openai', args: undefined }
            const { modelName, args } = aiModel

            this.model = MODELS[modelName](args)
        }
    }
}
