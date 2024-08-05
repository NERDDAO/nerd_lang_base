import { RunnablePassthrough, RunnableSequence } from "@langchain/core/runnables"
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { SYSTEM_PROMPT, SYSTEM_RAG } from "../prompts";
import { InvokeParams } from "../../types";
import { ZodType, ZodTypeDef } from "zod";
import z from "zod"
import { JsonOutputParser } from "@langchain/core/output_parsers";

export default class Runnable {

  constructor(private model: BaseChatModel, private prompt?: string) {}

  async retriever<T>(context: string, invokeParams: InvokeParams, 
    schema?: ZodType<T, ZodTypeDef, T>) {

    let prompt: any = this.prompt ? ChatPromptTemplate.fromTemplate(`${this.prompt}\n${SYSTEM_RAG}`) : SYSTEM_PROMPT

    if (this.model?.withStructuredOutput) {
        prompt = prompt
            .pipe(this.model.withStructuredOutput(schema))
    } else {
        prompt = prompt.pipe(this.model
            .pipe(
                new JsonOutputParser()
            ))
    }

    return RunnableSequence.from([
        RunnablePassthrough.assign({
            context: async () => {
                return context
            }
        }),
        prompt
    ]).invoke(invokeParams) as z.infer<typeof schema>
}
  
}