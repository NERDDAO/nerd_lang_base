
import "dotenv/config"
import { createBot, createProvider, createFlow, EVENTS } from '@builderbot/bot'
import { MemoryDB as Database } from '@builderbot/bot'
import { TelegramProvider as Provider } from "@builderbot-plugins/telegram"

import z from "zod"
import { createAIFlow } from "./index"

import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";


import { Chroma } from "@langchain/community/vectorstores/chroma";

import type { Document } from "@langchain/core/documents";
const embeddings = new HuggingFaceInferenceEmbeddings({
    apiKey: process.env.HUGGINGFACEHUB_API_KEY, // In Node.js defaults to process.env.HUGGINGFACEHUB_API_KEY
});
/*FLOW DEFINITION*/
const makeVectorStore = (name: string) => {

    return new Chroma(embeddings, {
        collectionName: name,
        url: process.env.CHROMADB_URL, // Optional, will default to this value
    });
}

const aiflow = createAIFlow

    .setKeyword(["Raggy", "raggy", "Rag", "rag"])
    .setStructuredLayer(z.object({
        intention: z.enum(['NORMAL', 'GLOBAL', 'SEARCH']).describe(`query types:
            NORMAL: Normal queries exploring the context
            GLOBAL: Queries that may benefit from being broadcasted to the network
            SEARCH: Look for information outside your context
    `),
		search:z.boolean().describe('search on the internet?'),
        haiku: z.string().describe('the semantic content of the query'),
    }), async (ctx, { flowDynamic, state, gotoFlow }) => {
        console.log(ctx?.schema)
        //flowDynamic("thinking")

        if (ctx?.schema) {
            const { intention } = ctx.schema
            if (intention == 'REPORT') {
                //return gotoFlow(aiflow)
            }
        }
    })
    .setContextLayer(
    z.object({
        inference: z.string().describe('the current query intention'),
        haiku: z.string().describe('a haiku extracting the semantic content'),
        entityExtraction: z.array(z.string()).describe('key entities mentioned in the query'),
        topicClassification: z.array(z.string()).describe('relevant topics/categories'),
        sentimentAnalysis: z.number().describe('sentiment score (-1 to 1)'),
        urgencyLevel: z.number().min(1).max(10).describe('urgency level of the query'),
        complexityScore: z.number().min(1).max(10).describe('estimated complexity of the query'),
        requiredExpertise: z.array(z.string()).describe('domains or skills needed to answer'),
        contextualKeywords: z.array(z.object({
            keyword: z.string(),
            relevance: z.number()
        })).describe('important keywords with relevance scores'),
        intentionConfidence: z.number().min(0).max(1).describe('confidence in detected intention'),
        languageStyle: z.string().describe('linguistic style of the query'),
        temporalContext: z.enum(['past', 'present', 'future']).describe('time focus of the query')
    }),
        async (ctx) => {
            const { intention } = ctx.schema
            if (intention == 'SEARCH') {
``

                const tool = new TavilySearchResults({ maxResults: 3 });

                const result = await tool.invoke({
                    input: ctx?.context.prompt,
                });
                ctx.search = result

            }

        }
    )
    .setStore({
        searchFn: async (term) => {
            console.log({ storeTerm: term })
            const vectorStore = makeVectorStore("nerdTable")
            const resultOne = await vectorStore.similaritySearch(term, 10);
            return resultOne
        }
    })
    .createRunnable({
        answerSchema: z.object({
            answer: z
                .string()
                .describe('A very nuanced answer.')
        }).describe(`you are a coordination engine maximize stigmergy`)
    }, {
        onFailure: (err) => {
            console.log({ err })
        }

    })

    .setContextLayer(z.object({
        haiku: z
            .string()
            .describe('the semantic payload expressed in a haiku'),
        book: z
            .string()
            .describe('the compilation which this haiku is a part of'),
        eval: z
            .number()
            .describe("the quality of the provided context use numbers from 1 to 10")

    }).describe("Exctracting the semantic payload of the context."),
        async (ctx) => {
            console.log({ payload: ctx?.context })
        }
    )

    .pipe(({ addAction }) => {

        return addAction(async (ctx, { endFlow, flowDynamic, state }) => {
            const response = state.get('answer')
        console.log(response)
            const payload = {
                time: Date.now(),
                query: ctx.body,
                haiku: ctx.context,
                response: response.answer
            }

            const documents = [
                {
                    pageContent: JSON.stringify(payload),
                    metadata: {
                        time: payload.time,
                        owner: ctx.from,
                        haiku: ctx.context
                    }

                }
            ]

            try {

                const gstore = makeVectorStore(`db${ctx.from.toString()}`)

                const moreIds = await gstore.addDocuments(documents)
                state.update({ documents })
                if (ctx.schema.intention != "GLOBAL") {
                    endFlow()
                }
            } catch (e) {
                flowDynamic(`${e}`)
            }
        }).addAnswer("Embedding globally to nerdTable", { capture: false }, async (ctx, { state, flowDynamic, endFlow }) => {

            const documents = state.get('documents')




            //flowDynamic(`"Interesting!`)
            let ids: any[]



            const store = makeVectorStore("nerdTable")
            ids = await store.addDocuments(documents);

            console.log(documents, ids)
        })
    })

    .createFlow()

const main = async () => {
    
    const PORT = process.env.PORT ?? 3008
    const adapterFlow = createFlow([aiflow])

    const adapterProvider = createProvider(Provider,{
        token:process.env.TELEGRAM_BOT_TOKEN
    })
    adapterProvider.on('message', (ctx) => console.log('new message', ctx.body))
    const adapterDB = new Database()

    const { httpServer, handleCtx } = await createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })
    httpServer(+PORT)


    adapterProvider.server.post(
        '/v1/loyalty',
        handleCtx(async (bot, req, res) => {
            const { number, name } = req.body
            await bot?.dispatch('L0Y4LTY', { from: number, name })
            return res.end('trigger')
        })
    )
  
}

main()

