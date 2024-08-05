
This is a mockup with a shopify store client and Orama retriever

```ts
import "dotenv/config"
import { createBot, createProvider, createFlow, EVENTS } from '@builderbot/bot'
import { MemoryDB as Database } from '@builderbot/bot'
import { TelegramProvider as Provider } from "@builderbot-plugins/telegram"

import z from "zod"
import { createAIFlow } from "./src/index"

import { OramaClient } from '@oramacloud/client' 
import { Product } from "./src/types"

const client = new OramaClient({ 
    endpoint: 'https://cloud.orama.run/v1/indexes/my-shopify-irxv20', 
    api_key: 'YOUR-ORAMA-API-KEY' 
  }) 

const aiflow = createAIFlow
    .setKeyword(EVENTS.WELCOME)
    .pipe(({ addAnswer }) => {
        return addAnswer('Hola!, dejame buscar entre el stock...')
    })
    .setStructuredLayer(z.object({ 
        intention: z.enum(['SALES']).describe(`La intención del cliente:
            SALES: Si el cliente pregunta, quiere informacion o esta interesado en uno o mas productos
        
        `)
    }), async (ctx, { endFlow }) => {
        console.log(ctx?.schema)
        if (ctx?.schema) {
            const { intention } = ctx.schema
            
            if (intention !== 'SALES') {
                return endFlow('Lo siento, Intenta preguntando sobre un producto')
            }
        }
    })
    .setContextLayer(
        z.object({
            product_name: z.string().describe('El producto que busca el cliente'),
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

            const mapProducts = products.map(({ 
                title,
                variants,
                priceRange,
                options,
                description, 
                featuredImage,  }) => ({
                    product_description: description,
                    product_image: featuredImage.url,
                    product_name: title,
                    // product_variants: variants
                    // .map(({ price, selectedOptions }) => ({ price, options: selectedOptions })),
                    product_price: priceRange.min,
                    // product_options: options,
                }))

            return mapProducts
        }
    })
    .createRunnable({
         answerSchema: z.object({
            answer: z
              .string()
              .describe('Agrega una respuesta breve y clara sobre el producto.'),
            metadata: z.array(z.object({
            product_image: z.string()
                .describe('La url de la imagen del producto'),
            product_name: z
              .string()
              .describe("Nombre exacto del producto (SIN ALTERAR) que pregunta el cliente debe venir del contexto."),
            product_price: z
              .string()
              .describe(
                "precio exacto del producto (SIN ALTERAR) que pregunta el cliente debe venir del contexto."
              ),
            product_description: z
              .string()
              .describe(
                "Dale un breve pitch de venta a la descripcion del producto indica beneficios y caracteristicas (SIN ALTERAR) que pregunta el cliente debe venir del contexto."
              )
          }))
          .nullable().default([])
          .describe('Dado los siguientes productos, estructura los que tengan relación con la busqueda')
          }).describe('El formato de respuesta debe ser el siguiente')
    }, {
        onFailure: (err) => {
            console.log({ err })
        }
    })
    .pipe(({ addAction }) => {
        return addAction(async (_, { state, endFlow }) => {
            const answer = state.get('answer')
            console.log('answer', answer)
            if (!answer?.metadata?.length) {
                return endFlow('Lo siento, Intenta preguntando sobre otro producto')
            }

            await state.update({ purchase: answer.metadata })
        })
        .addAction(async (_, { state, flowDynamic }) => {
            const purchase = state.get('purchase')

            const template = purchase.map((p: any, i: number) => `${i+1}. ${p.product_name}\nPrecio: $${p.product_price} c/u`).join('\n\n')

            await flowDynamic(`Estos son algunos de nuestros productos: \n\n ${template}`, { delay: 700 })
            flowDynamic(`Indicame cual deseas ver, ${Array.from({ length: purchase.length}, (_, i) => i + 1).join(' o ')}`)
        })
        .addAction({ capture: true }, async (ctx, { state, flowDynamic }) => {
            const purchase = state.get('purchase') as Array<any>

            const product  = purchase.at(Number(ctx.body) -1)
            await state.update({ product })
            flowDynamic([
                {
                    body: `${product.product_name} - $${product.product_price} c/u\n\n${product.product_description}`,
                    media: product.product_image
                }
            ])
        })
        .addAnswer('¿Deseas comprar el producto (SI / NO)?')
    })
    .setStructuredLayer(z.object({
        intention: z.enum(['SI', 'NO']).describe('Repuesta del ususario')
    }), async (ctx, { endFlow, state, flowDynamic }) => {
        const product = state.get('product') as any
        if (ctx?.schema?.intention !== 'SI') {
            return endFlow('Estare acá por si deseas preguntar sobre otro producto')
        }

        const sc = [
            {    
                name: product?.product_name,
                price: product?.product_price
            }
        ] 
        if (state.getMyState()?.sc?.length) {
            await state.update({
                sc: [
                    ...state.getMyState()?.sc,
                    // @ts-ignore
                    {    
                        name: product?.product_name,
                        price: product?.product_price
                    }
                ]
            })
        } else {
            // @ts-ignore
            await state.update({ 
                sc
            })
        }

        const products = sc.map((p) => `${product.product_name.trim()} $${product.product_price} c/u\n`).join('\n')
        const total = sc.map(p => Number(product.product_price)).reduce((a, b) => Math.abs(a + b))
        const template = `Tu compra es:\n${products}\nTotal: $${total} dolares.`

        await flowDynamic(template)

        return endFlow()
    }, { capture: true })
    .createFlow()

const main = async () => {
    
    const PORT = process.env.PORT ?? 3008
    const adapterFlow = createFlow([aiflow])

    const adapterProvider = createProvider(Provider)
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

```# nerd_lang_base
