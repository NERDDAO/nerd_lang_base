
import "dotenv/config"
import { createBot, createProvider, createFlow, EVENTS, addKeyword } from '@builderbot/bot'
import { TelegramProvider as Provider } from "@builderbot-plugins/telegram"
import { MongoAdapter as Database } from '@builderbot/database-mongo'
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
    .setStructuredLayer(
        z.object({
            intention: z.enum(['CLARIFICATION', 'INFORMATION', 'ANALYSIS', 'TASK']).describe(`Query types:
            CLARIFICATION: Requests for more information or explanation
            INFORMATION: Queries seeking factual knowledge
            ANALYSIS: Requests for insights, opinions, or interpretations
            TASK: Queries related to performing a specific action
        `),
            targetEntity: z.string().optional().describe('The main entity or topic the query is about'),
            relatedEntities: z.array(z.string()).optional().describe('Additional entities related to the query'),
            queryContext: z.string().optional().describe('Any additional context provided with the query'),
            searchRequired: z.boolean().describe('Whether an external search is needed to answer the query'),
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
            const { searchRequired } = ctx.schema
            if (searchRequired == true) {
                interface SearchResult {
                    title: string;
                    content: string;
                    url: string;
                }
                function simplifySearchResults(results: string | any[]): SearchResult[] {
                    let parsedResults: any[];

                    if (typeof results === 'string') {
                        try {
                            parsedResults = JSON.parse(results);
                        } catch (error) {
                            console.error('Error parsing results string:', error);
                            return [];
                        }
                    } else if (Array.isArray(results)) {
                        parsedResults = results;
                    } else {
                        console.error('Invalid input type. Expected string or array.');
                        return [];
                    }

                    return parsedResults.map(result => ({
                        title: result.title,
                        content: result.content,
                        url: result.url
                    }));
                }
                function flattenSearchResults(results: SearchResult[]): string {
                    return results.map(result => `Title: ${result.title}\nContent: ${result.content}\nLink:${result.url}`).join('\n\n');
                }

                // In your main code:
                //
                const tool = new TavilySearchResults({ maxResults: 3 });

                const result = await tool.invoke({
                    input: ctx?.schema.haiku,
                });


                const simpleSearch = simplifySearchResults(result);
                const flattenedSearch = flattenSearchResults(simpleSearch);
                console.log(flattenedSearch, "LOGGING HERE ");


                ctx.search = simpleSearch

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
        eval: z.object({
            responseQuality: z.number().min(1).max(10).describe('Estimated quality of the generated response'),
            responseAppropriate: z.boolean().describe('Whether the response is appropriate and relevant to the original query'),
            responseCompleteness: z.number().min(0).max(1).describe('Degree of completeness in addressing the query'),
            responseConfidence: z.number().min(0).max(1).describe('Confidence in the accuracy and reliability of the response'),
            responseRelevantInfo: z.array(z.string()).describe('Key relevant information included in the response')
        })
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
                haiku: ctx.context.haiku,
                response: response.answer,
                quality: ctx.context.responseQuality,
                appropriate: ctx.context.responseAppropriate,
                completeness: ctx.context.responseCompleteness,
                confidence: ctx.context.responseConfidence,
                relevantInfo: ctx.context.responseRelevantInfo
            }
            const documents = [
                {
                    pageContent: JSON.stringify(payload),
                    metadata: {
                        time: payload.time,
                        owner: ctx.from,
                        eval: ctx.context.eval
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


const main = async () => {

    const PORT = process.env.PORT ?? 3010
    const adapterFlow = createFlow([aiflow, welcomeFlow])

    const adapterProvider = createProvider(Provider, {
        token: process.env.TELEGRAM_BOT_TOKEN
    })
    adapterProvider.on('message', (ctx) => console.log('new message', ctx.body))
    const adapterDB = new Database({

        dbUri: process.env.MONGODB_URI,
        dbName: process.env.MONGODB_NAME,

    })

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

