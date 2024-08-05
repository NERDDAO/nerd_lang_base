
import "dotenv/config"
import { createBot, createProvider, createFlow, EVENTS } from '@builderbot/bot'
import { MemoryDB as Database } from '@builderbot/bot'
import { TelegramProvider as Provider } from "@builderbot-plugins/telegram"

import z from "zod"
import { createAIFlow } from "./index"

import { OramaClient } from '@oramacloud/client'
import { Product } from "./types"
import { typing } from "./utils/presence"

const client = new OramaClient({
    endpoint: 'https://cloud.orama.run/v1/indexes/videogames-awqnqs',
    api_key: 'GFwsfVcpqqmOEE65ty4Xc9ywC11fXpq1'
})

const aiflow = createAIFlow
    .setKeyword(EVENTS.WELCOME)
    .setStructuredLayer(z.object({
        intention: z.enum(['NERD']).describe(`La intención del cliente:
            NERD: Si el cliente parece ser un nerd
        
        `)
    }), async (ctx, { endFlow }) => {
        console.log(ctx?.schema)
        if (ctx?.schema) {
            const { intention } = ctx.schema

            if (intention !== 'NERD') {
                return endFlow('Lo siento, Intenta preguntando sobre un producto')
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
            console.log({ term })

            const { hits } = await client.search({ term, limit: 7 }) as any
            const products = hits.map(hit => hit.document) as Product[]

            const mapProducts = products.map((
                titulo
            ) => ({
                titulo: titulo,

            }))

            return mapProducts
        }
    })
    .createRunnable({
        answerSchema: z.object({
            answer: z
                .string()
                .describe('Agrega una respuesta breve y clara sobre la pregunta.')
        }).describe('El formato de respuesta debe ser el siguiente')
    }, {
        onFailure: (err) => {
            console.log({ err })
        }
    })
    .pipe(({ addAnswer }) => {

        return addAnswer("Thinking")
            .addAction(async (ctx, { flowDynamic, state, provider }) => {
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
        token:"7413703587:AAE44YwXighBXJSPjFj8J3ZjpET8MW8uRkI"
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
