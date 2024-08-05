import { EVENTS, addKeyword } from "@builderbot/bot";
import { AiModel, Callbacks, ModelArgs, ModelName } from "../types";
import { FactoryModel } from "../ai";
import { ZodSchema, ZodType, ZodTypeDef } from "zod";
import { TFlow } from "@builderbot/bot/dist/types";
import { schemasFn } from "../ai/functions";


export default class StructuredOutput {
    private static kwrd: TFlow<any, any> = addKeyword(EVENTS.ACTION)
    private static schema: ZodSchema
    private static model: FactoryModel

    static setKeyword = (ev: any) => {
        this.kwrd = addKeyword(ev, { sensitive: false })
        return this
    }

    static setZodSchema = <T>(schema: ZodType<T, ZodTypeDef, T>) => {
        this.schema = schema
        return this
    }

    static setAIModel = (ai: AiModel) => {
        this.model = new FactoryModel(ai)
        return this
    }

    static create = (callbacks?: Callbacks) => {
        if (!this.schema) {
            throw new Error('You must set the zod schema method first')
        }

        if (!this.model) {
            this.model = new FactoryModel()
        }

        this.kwrd = callbacks?.beforeStart && callbacks?.beforeStart(this.kwrd) || this.kwrd

        this.kwrd = this.kwrd.addAction(async (ctx, { state }) => {
            try {
                const responseSchema = await schemasFn(ctx.body, this.schema, this.model, state)

                await state.update({ schema: responseSchema })
            } catch (error) {
                callbacks?.onFailure && callbacks?.onFailure(error)
                await state.update({ schema: null })
            }

        })
        this.kwrd = callbacks?.afterEnd && callbacks?.afterEnd(this.kwrd) || this.kwrd
        return this.kwrd
    }
}