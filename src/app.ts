
import "dotenv/config"
import { createBot, createProvider, createFlow, EVENTS } from '@builderbot/bot'
import { MemoryDB as Database } from '@builderbot/bot'
import { TelegramProvider as Provider } from "@builderbot-plugins/telegram"
import { OllamaEmbeddings } from "@langchain/community/embeddings/ollama";
import z from "zod"
import { createAIFlow } from "./index"
import { typing } from "./utils/presence"
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { FastEmbedding } from "@builderbot-plugins/fast-embedding";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";

const embeddings = new HuggingFaceInferenceEmbeddings({
    apiKey: "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", // In Node.js defaults to process.env.HUGGINGFACEHUB_API_KEY
});
/*DB LOADER
 *

})



const embeddings = new OllamaEmbeddings({
    model: "nomic-embed-text", // default value
    baseUrl: "http://0.0.0.0:11434", // default value
    requestOptions: {
        useMMap: true,
        numThread: 6,
        numGpu: 1,
    },
})
 * */


const aiflow = createAIFlow
    .setKeyword(EVENTS.WELCOME)
    .setStructuredLayer(z.object({
        intention: z.enum(['NERD', 'NORMIE']).describe(`La intención del cliente:
            NERD: Si el cliente parece ser un nerd
            NORMIE: Si no es una pregunta nerd
        
        `)
    }), async (ctx, { endFlow }) => {
        console.log(ctx?.schema)
        if (ctx?.schema) {
            const { intention } = ctx.schema

            if (intention !== 'NERD') {
                return endFlow('Lo siento, Intenta ser mas nerd')
            }
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
            //const docs = await loadFile("./files")

            console.log({ term })


            const vectorStore = await Chroma.fromExistingCollection(
                embeddings,
                {
                    collectionName: "a-test-collection-3-2",
                    url: "http://provider.a6000.mon.obl.akash.pub:32635", // Optional, will default to this value
                } // 
            )
            const resultOne = await vectorStore.similaritySearch(term, 5);
            return resultOne
        }
    })
    .createRunnable({
        answerSchema: z.object({
            answer: z
                .string()
                .describe('use the provided context to reply')
        }).describe('You are a helpful nerd')
    }, {
        onFailure: (err) => {
            console.log({ err })
        }
    })
    .pipe(({ addAction }) => {

        return addAction(async (ctx, { flowDynamic, state, provider }) => {
            await typing(ctx, provider)
            const response = state.get('answer')
            const chunks = response.answer.split(/\n\n+/);
            for (const chunk of chunks) {
                await flowDynamic([{ body: chunk.trim() }]);
            }
        })
    })
    .createFlow()

const main = async () => {
    const PORT = 3010
    const adapterFlow = createFlow([aiflow])

    const adapterProvider = createProvider(Provider, {
        token: "7196484074:AAGTeQUelgUtqf0EWtCz-CquOuJpYqLsQ_4"
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
