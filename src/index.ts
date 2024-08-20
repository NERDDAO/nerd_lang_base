import { EVENTS, addKeyword } from "@builderbot/bot";
import { Callbacks, Retriever, Store, RunnableConf, AiModel } from "./types";
import { FactoryModel, Memory, Runnable } from "./ai";
import { ZodType, ZodTypeDef } from "zod";
import { TFlow, BotContext, BotMethods } from "@builderbot/bot/dist/types";
import StoreRetriever from "./ai/stores";
import ContextualCompression from "./ai/contextuals";
import { StructLayer, TransformLayer } from "./layers";
import { CustomRetriever } from "./ai/retrievers";
import { BaseRetriever } from "@langchain/core/retrievers";
import { StructuredOutputParser } from "langchain/output_parsers";

import z from "zod"

class createAIFlow {
    private static kwrd: TFlow<any, any> = addKeyword(EVENTS.ACTION)
    private static store: BaseRetriever

    static setKeyword = (ev: any) => {
        this.kwrd = addKeyword(ev, { sensitive: false })
        return this
    }

    static setStore = (args: Partial<Store & Retriever>) => {
        if (!args?.conf && !args?.searchFn) {
            throw new Error('Either urlOrPath or searchFn must be provided')
        }

        if (args?.conf && Object.keys(args?.conf).includes('urlOrPath')) {
            const store = args.conf
            this.store = new StoreRetriever({
                urlOrPath: store?.urlOrPath,
                schema: store?.schema,
                store: store?.store,
                embeddings: store?.embeddings,
                httpConf: store?.httpConf
            })
        }else {
            this.store = new CustomRetriever(args.searchFn, args?.fields)
        }
        return this
    }

    static setStructuredLayer = <T>(schema: ZodType<T, ZodTypeDef, T>, cb: (ctx: BotContext, methods: BotMethods) => Promise<void>, opts?: { capture: boolean, aiModel?: AiModel }) => {
        
        this.kwrd = this.kwrd.addAction({ capture: opts?.capture || false }, 
            new StructLayer(schema, opts?.aiModel).createCallback(cb))
        return this
    }

    static setContextLayer = <T>(schema: ZodType<T, ZodTypeDef, T>, cb: (ctx: BotContext, methods: BotMethods) => Promise<void>, opts?: { capture: boolean, aiModel?: AiModel }) => {
        this.kwrd = this.kwrd.addAction({ capture: opts?.capture || false }, 
            new TransformLayer(schema, opts?.aiModel).createCallback(cb))
        return this
    }

    static setConditionalLayer = (opts: { capture: boolean }, cb: (ctx: BotContext, methods: BotMethods) => Promise<void>) => {
        //pass
        console.warn('[INFO] setConditionalLayer is not supported yet :)')
        return this
    }

    static pipe = (fn: (flow: TFlow<any, any>) => TFlow<any, any>) => {
        this.kwrd = fn(this.kwrd)
        return this
    }

    static createRunnable = (opts?: RunnableConf, callbacks?: Callbacks) => {
        let contextual = opts?.customContextual || new ContextualCompression(opts?.contextual?.retriever || this.store, opts?.contextual?.contextOpts);
        let model: FactoryModel = new FactoryModel(opts?.aiModel);

        const schema = opts?.answerSchema || z.object({ answer: z.string().describe('Answer as best possible') })
        const format_instructions = new StructuredOutputParser(schema).getFormatInstructions()

        this.kwrd = this.kwrd.addAction(async (ctx, { state, flowDynamic }) => {
            try {
                if (ctx?.context && typeof ctx.context === 'object') {
                    ctx.context = Object.values(ctx.context).join(' ')
                }else if (Array.isArray(ctx.context)) {
                    ctx.context = ctx.context.join(' ')
                }

                const context = await contextual.invoke(ctx?.context || ctx.body)
                const mapContext = context.map(doc => doc.pageContent).join('\n')
                
                const answer = await new Runnable(model.model, opts?.prompt).retriever(
                    mapContext,
                    {
                        question: ctx.body,
                        persona:"Youre a coordination agent",
                        language: 'spanish',
                        search: '',
                        tables:"",
                        activeTable:"",
                        history: await Memory.getMemory(state) || [],
                        format_instructions
                    },
                    schema
                )

                Memory.memory({ user: ctx.body, assistant: JSON.stringify(answer) }, state)

                 console.log(answer, ctx.search)
                const chunks = answer.answer.split(/\n\n+/);
                for (const chunk of chunks) {
                    await flowDynamic([{ body: chunk.trim() }]);
                }
                await state.update({ answer })
            } catch (error) {
                callbacks?.onFailure && callbacks?.onFailure(error)
                await state.update({ answer: null })
            }
        })
        return this
    }

    static createFlow = () => {
        return this.kwrd
    }

}


export { createAIFlow }
export * from "./layers"
export * from "./flows"
