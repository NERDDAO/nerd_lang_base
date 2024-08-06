
import "dotenv/config"
import { createBot, createProvider, createFlow, EVENTS } from '@builderbot/bot'
import { MemoryDB as Database } from '@builderbot/bot'
import { TelegramProvider as Provider } from "@builderbot-plugins/telegram"

import { LanceDB}  from "@langchain/community/vectorstores/lancedb";
import z from "zod"
import { createAIFlow } from "./index"
import { OramaClient } from '@oramacloud/client'
import { typing } from "./utils/presence"  
import StoreManager from "./ai/stores/storeManager";


const client = new OramaClient({
    endpoint: 'https://cloud.orama.run/v1/indexes/videogames-awqnqs',
    api_key: 'GFwsfVcpqqmOEE65ty4Xc9ywC11fXpq1'
})
/*DB LOADER
 *
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
        conf:{urlOrPath:"./data", schema:[], store:new LanceDB},
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

    const PORT =  3010
    const adapterFlow = createFlow([aiflow])

    const adapterProvider = createProvider(Provider, {
        token:"7196484074:AAGTeQUelgUtqf0EWtCz-CquOuJpYqLsQ_4"
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
