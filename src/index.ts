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
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { makeVectorStore, createVectorStoreDocumentsForChat } from "./utils/stores";
import clientPromise from "./lib/mongodb";
import z from "zod"

import type { Document } from '@langchain/core/documents';
const client = clientPromise;

// Assuming you have a MongoDB client instance
const db = client.db('nerDB');

// Define the structure of the user document



// Function to create vector store documents based on the chat ID
//



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
        } else {
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

        const embeddings = new HuggingFaceInferenceEmbeddings({
            apiKey: process.env.HUGGINGFACEHUB_API_KEY, // In Node.js defaults to process.env.HUGGINGFACEHUB_API_KEY
        });

        this.kwrd = this.kwrd.addAction(async (ctx, { state, flowDynamic }) => {

            const { documents, ids } = await createVectorStoreDocumentsForChat(Number(ctx.from));

            const vectorStore = await makeVectorStore(`nft-${ctx.from}`);

            // Now you can add these documents to the vector store
            await vectorStore.addDocuments(documents, { ids });

            const persona = await vectorStore.similaritySearch(`the right persona for this query: ${ctx.body}`, 1)

            try {
                if (ctx?.context && typeof ctx.context === 'object') {
                    ctx.context = Object.values(ctx.context).join(' ')
                } else if (Array.isArray(ctx.context)) {
                    ctx.context = ctx.context.join(' ')
                }

                const vectorStore = new Chroma(embeddings, {
                    collectionName: `db${ctx.from.toString()}`,
                    url: process.env.CHROMADB_URL, // Optional, will default to this value
                });


                //const { documents, ids } = await createVectorStoreDocuments(grps, tgChats);

                // Now you can add these documents to the vector store
                //await vectorStore.addDocuments(documents, { ids });

                const selfContextual = new ContextualCompression(vectorStore.asRetriever(5), opts?.contextual?.contextOpts);
                const context = await contextual.invoke(ctx?.context || ctx.body)
                const selfContext = await selfContextual.invoke(ctx?.context || ctx.body)
                const mapContext = context.map(doc => doc.pageContent).join('\n')
                const selfMap = selfContext?.map(doc => doc.pageContent).join('\n')
                const metaContext = [mapContext, selfMap].join('\n')

                const answer = await new Runnable(model.model, opts?.prompt).retriever(
                    metaContext,
                    {
                        question: ctx.body,
                        persona: persona[0].pageContent,
                        language: 'english',
                        search: ctx.search,
                        tables: "",
                        activeTable: "",
                        history: await Memory.getMemory(state) || [],
                        format_instructions
                    },
                    schema
                )

                Memory.memory({ user: ctx.body, assistant: JSON.stringify(answer) }, state)

                console.log(persona)

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
