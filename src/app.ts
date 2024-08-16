
import "dotenv/config"
import { createBot, createProvider, createFlow, EVENTS, addKeyword } from '@builderbot/bot'
import { MemoryDB as Database } from '@builderbot/bot'
import { TelegramProvider as Provider } from "@builderbot-plugins/telegram"
import z from "zod"
import { createAIFlow } from "./index"
import { typing } from "./utils/presence"
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";

import { idleFlow } from './flows/idle-custom'

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
const welcomeFlow = addKeyword(EVENTS.WELCOME)
    .addAction(async (ctx, { state, globalState, flowDynamic }) => {
        const name = ctx.from.toString()
        state.update({ name })
        let names: string[] = await globalState.get('names') || []
        if (names.length == 0) {
            globalState.update({ names: [] })
        }
        console.log(names)
        if (names.indexOf(name) == -1) {
            flowDynamic('Creating Index! say "Raggy" to interact!')
            const vectorStore = new Chroma(embeddings, {
                collectionName: `db${ctx.from.toString()}`,
                url: process.env.CHROMADB_URL, // Optional, will default to this value
            });

            ctx.vectorStore = vectorStore;

            try {

                const document1: Document = {
                    pageContent: `name: ${ctx?.name} date:${Date.now()}`,
                    metadata: { source: (ctx.name || `tg${ctx.from}`) },
                };
                const documents = [document1];

                await vectorStore.addDocuments(documents, { ids: ["1"] });
            } catch (e) {
                console.log({ e })
            }
            names.push(name)
            globalState.update({ names })
            console.log(names)

        }
    })
//const roller = new rpgDiceRoller.DiceRoller()
const dndFlow = createAIFlow
    .setKeyword(["Raggy", "raggy", "Rag", "rag"])
    .setStructuredLayer(z.object({
        intention: z.enum(['NORMAL', 'GLOBAL', 'SEARCH']).describe(`query types:
            NORMAL: Normal queries exploring the context
            GLOBAL: Queries that may benefit from being broadcasted to the network
            SEARCH: Look for information outside your context
    `)
    }), async (ctx, { flowDynamic, state, gotoFlow }) => {
        console.log(ctx?.schema)

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
            prompt: z.string().describe('a helper search prompt')
        }),
        async (ctx) => {
            const { intention } = ctx.schema
            if (intention == 'SEARCH') {


                const tool = new TavilySearchResults({ maxResults: 3 });

                const result = await tool.invoke({
                    input: ctx?.context.prompt,
                });
                ctx.search = { result }

                console.log({ details: ctx?.context, search: ctx.search })

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
            .describe('a haiku haiku features three lines of five, seven, and five syllables, respectively split lines with "\n"'),
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

            const gstore = makeVectorStore(`db${ctx.from.toString()}`)

            const moreIds = await gstore.addDocuments(documents)
            state.update({ documents })
            if (ctx.schema.intention != "GLOBAL") {
                endFlow(`embedded ${moreIds}`)
            }
        }).addAnswer("Embed to nerdTable? (yes / no)", { capture: true }, async (ctx, { state, flowDynamic, endFlow }) => {
            if (ctx.body == "no") {
                endFlow(":(")
            }
            const documents = state.get('documents')




            flowDynamic(`"Interesting!`)
            let ids: any[]



            const store = makeVectorStore("nerdTable")
            ids = await store.addDocuments(documents);

            console.log(documents, ids)
        })
    })
    .createFlow()




const main = async () => {

    const PORT = 3010
    const adapterFlow = createFlow([dndFlow, welcomeFlow])

    const adapterProvider = createProvider(Provider, {
        token: process.env.TELEGRAM_BOT_TOKEN
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
