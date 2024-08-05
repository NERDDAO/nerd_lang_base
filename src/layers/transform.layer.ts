import { AiModel } from "../types";
import { FactoryModel } from "../ai";
import { ZodType, ZodTypeDef } from "zod";
import {  BotContext, BotMethods, CallbackFunction } from "@builderbot/bot/dist/types";
import { schemasFn } from "../ai/functions";
import z from "zod"

export default class TransformLayer<T> {
    model: FactoryModel
    constructor(private schema: ZodType<T, ZodTypeDef, T>, private aiModel?: AiModel) {
        this.schema = this.schema 

        this.model = new FactoryModel(aiModel)

    }

    createCallback = (cb: (ctx: BotContext, methods: BotMethods) => Promise<void>): CallbackFunction<any, any> => {
        
        return  async (ctx: BotContext, methods: BotMethods) => {
            try {
                const format =  await schemasFn(ctx.body, this.schema, this.model, methods.state) as z.infer<typeof this.schema>
                ctx.context = format          
            } catch (error) {
                ctx.context = null
            }

            return await cb(ctx, methods)
            
        }

        
    }
}

