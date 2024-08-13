
import "dotenv/config"
import { createBot, createProvider, createFlow, EVENTS } from '@builderbot/bot'
import { MemoryDB as Database } from '@builderbot/bot'
import { TelegramProvider as Provider } from "@builderbot-plugins/telegram"
import z from "zod"
import { createAIFlow } from "./index"
import { typing } from "./utils/presence"
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { Alchemy, Network } from "alchemy-sdk"
import { Wallet, getDefaultProvider } from "ethers";
import * as rpgDiceRoller from '@dice-roller/rpg-dice-roller';
import { JSONLoader } from "langchain/document_loaders/fs/json";
import { TextLoader } from "langchain/document_loaders/fs/text"
import { Database as TablelandDB } from "@tableland/sdk";


/* TBLAND CONFIG
const pkey = process.env.BOT_PKEY;

const wallet = new Wallet(pkey)

const provider = getDefaultProvider("https://public.stackup.sh/api/v1/node/base-sepolia	")

const signer = wallet.connect(provider);

const db = new TablelandDB({ signer });

const createTable = async (prefix: string) => {
    // This is the table's `prefix`--a custom table value prefixed as part of the table's name
    const { meta: create } = await db
        .prepare(`CREATE TABLE ${prefix} (id integer primary key, val text);`)
        .run();
    await create.txn?.wait();

    // The table's `name` is in the format `{prefix}_{chainId}_{tableId}`
    const tableName = create.txn?.names[0] ?? ""; // e.g., my_table_31337_2y
    return tableName
}

const addToTable = async (tableName: string) => {
    // Insert a row into the table
    const { meta: insert } = await db
        .prepare(`INSERT INTO ${tableName} (id, val) VALUES (?, ?);`)
        .bind(0, "Bobby Tables")
        .run();

    // Wait for transaction finality
    await insert.txn?.wait();
}

const readTable = async (tableName: string) => {
    const { results } = await db.prepare(`SELECT * FROM ${tableName};`).all();
    return results;
}

 */

const config = {
    apiKey: process.env.ALCHEMY_API_KEY, // Replace with your API key
    network: Network.BASE_MAINNET, // Replace with your network
};

const alchemy = new Alchemy(config);

const embeddings = new HuggingFaceInferenceEmbeddings({
    apiKey: process.env.HUGGINGFACEHUB_API_KEY, // In Node.js defaults to process.env.HUGGINGFACEHUB_API_KEY
});
/*FLOW DEFINITION*/
const vectorStore = new Chroma(embeddings, {
    collectionName: "a-test-collection-3-2",
    url: "http://chroma:8000", // Optional, will default to this value
});

//const roller = new rpgDiceRoller.DiceRoller()
const dndFlow = createAIFlow
    .setKeyword(["Raggy", "raggy", "Rag", "rag"])
    .setStructuredLayer(z.object({
        intention: z.enum(['NORMAL', 'REPORT', 'GENERATE']).describe(`query types:
            NORMAL: Normal queries exploring the context
            REPORT: Prompts requesting summaries or reports
            GENERATE: Create new info based on the context
    `)
    }), async (ctx, { flowDynamic, state, gotoFlow }) => {
        console.log(ctx?.schema)
        const contractAddress = "0x79e2b756f9c4c12bd8f80c0aeeb7b954e52ff23c";
        const tokenId = "28";

        // call the method
        let response = await alchemy.nft.getNftMetadata(contractAddress, tokenId, {});

        // logging the response to the console
        const persona = response.description
        ctx.schema.persona = persona
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

            console.log({ details: ctx?.context })
        }
    )
    .setStore({
        searchFn: async (term) => {
            console.log({ term })
            const vectorStore = await Chroma.fromExistingCollection(
                embeddings,
                {
                    collectionName: "a-test-collection-3-2",
                    url: "http://chroma:8000", // Optional, will default to this value
                } // 
            )
            const resultOne = await vectorStore.similaritySearch(term, 15);
            return resultOne
        }
    })
    .createRunnable({
        answerSchema: z.object({
            answer: z
                .string()
                .describe('A very nuanced answer. REFRAIN FROM REPEATING THE CONTEXT DIRECLY')
        }).describe(`you are a coordination engine maximize stigmergy`)
    }, {
        onFailure: (err) => {
            console.log({ err })
        }
    })
    .setContextLayer(z.object({
        haiku: z
            .string()
            .describe('a haiku haiku features three lines of five, seven, and five syllables, respectively'),
        book: z
            .string()
            .describe('the compilation which this haiku is a part of'),
        eval: z
            .number()
            .describe("the quality of the provided context use numbers from 1 to 10")

    }).describe("Exctracting the semantic payload of the context. A haiku poem generally presents a single and concentrated image or emotion"),
        async (ctx) => {
            console.log({ details: ctx?.context })
        }
    )
    .pipe(({ addAction }) => {

        return addAction(async (ctx, { flowDynamic, state, provider }) => {
            await typing(ctx, provider)
            const response = state.get('answer')
            if (ctx?.schema) {
                const payload = {
                    time: Date.now(),
                    query: ctx.body,
                    haiku: ctx.context,
                    response: response.answer
                }

                const documents = [
                    {
                        pageContent: JSON.stringify(payload),
                        metadata: ctx

                    }
                ]


                if (ctx.context.eval > 5) {
                    flowDynamic("Interesting!")
                    const ids = await vectorStore.addDocuments(documents);

                    console.log(documents, ids)
                }

            }
        })
    })
    .createFlow()




const aiflow = createAIFlow
    .setKeyword(["Nerdo"])
    .setStructuredLayer(z.object({
        intention: z.enum(['NERD', 'NORMIE']).describe(`La intención del cliente:
            CONTEXT: query about the context
            RELATIONS: Action resuqsts
        
        `)
    }), async (ctx, { endFlow }) => {
        console.log(ctx?.schema)
        if (ctx?.schema) {
            const { intention } = ctx.schema

            console.log("NERDFLOW")
        }
    })
    .setContextLayer(
        z.object({
            pregunta: z.string().describe('la pregunta'),
        }),
        async (ctx) => {
            console.log({ details: ctx?.context })
        }
    )
    .setStore({
        searchFn: async (term) => {
            console.log({ term })
            const vectorStore = await Chroma.fromExistingCollection(
                embeddings,
                {
                    collectionName: "a-test-collection-3-2",
                    url: "http://chroma:8000", // Optional, will default to this value
                } // 
            )
            const resultOne = await vectorStore.similaritySearch(term, 10);
            return resultOne
        }
    })
    .createRunnable({
        answerSchema: z.object({
            answer: z
                .string()
                .describe('reply with a list of items exploring the promt and context')
        }).describe('you maximize coordination of the semantic loads of of your noosphere')
    }, {
        onFailure: (err) => {
            console.log({ err })
        }
    })
    /*.pipe(({ addAction }) => {

        return addAction(async (ctx, { flowDynamic, state, provider }) => {
            await typing(ctx, provider)
            const response = state.get('answer')
            const chunks = response.answer.split(/\n\n+/);
            for (const chunk of chunks) {
                await flowDynamic([{ body: chunk.trim() }]);
            }
        })
    })*/
    .createFlow()

const main = async () => {

    const PORT = 3010
    const adapterFlow = createFlow([aiflow, dndFlow])

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
