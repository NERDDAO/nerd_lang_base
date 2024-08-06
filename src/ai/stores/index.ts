import httpRequest from "../../utils/http.request";
import { Document } from "@langchain/core/documents";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import {
    JSONLoader,
    JSONLinesLoader,
} from "langchain/document_loaders/fs/json";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { CSVLoader } from "langchain/document_loaders/fs/csv";
import { PDFLoader } from "langchain/document_loaders/fs/pdf"
import { CallbackManagerForRetrieverRun } from "@langchain/core/callbacks/manager";
import { BaseRetriever, BaseRetrieverInput } from "@langchain/core/retrievers";
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";

import { FastEmbedding } from "@builderbot-plugins/fast-embedding"
import { Embeddings } from "@langchain/core/embeddings";
import { AxiosRequestConfig } from "axios";
import { VectorStoreRetriever } from "@langchain/core/vectorstores";

export default class StoreRetriever extends BaseRetriever {
    lc_namespace = ["langchain", "retrievers"];
    urlOrPath: string
    schema: string[]
    store?: any
    embeddings?: Embeddings
    httpConf?: AxiosRequestConfig
    constructor(
        private conf: {
            urlOrPath: string,
            schema: string[],
            store?: any,
            embeddings?: Embeddings,
            httpConf?: AxiosRequestConfig,
        },
        fields?: BaseRetrieverInput
    ) {
        super(fields)
        this.ingest().then(() => console.log('Ingested')).catch(err => {
            throw err
        })
        this.urlOrPath = this.conf?.urlOrPath
        this.schema = this.conf?.schema
        this.store = this.conf?.store
        this.embeddings = this.conf?.embeddings
        this.httpConf = this.conf?.httpConf
    }

    private async ingest() {
        const embeddings = this?.embeddings || new FastEmbedding('AllMiniLML6V2')

        if (!this.store) {
            this.store = HNSWLib
        }

        if (!this.store?.fromDocuments || !this.store?.addDocuments) {
            throw new Error('Store must have a fromDocuments or addDocuments method')
        }

        const url_re = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
        if (url_re.test(this.urlOrPath)) {
            if (!this.schema) {
                throw new Error('You must set the schema array first')
            }
            const data = await httpRequest(this.urlOrPath, this?.httpConf || { headers: { 'Content-Type': 'application/json' } })

            if (!Array.isArray(data) || !data.length) {
                throw new Error('The data must be an array with at least one element')
            }

            const obj = data.map((d: any) => Object.keys(d).map(key => {
                if (this.schema.includes(key)) {
                    return data[key]
                }
            })
            )

            const documents = obj.map((d: any) => new Document({
                pageContent: Object.entries(d).map(([k, v]) => `${k}: ${v}`).join('\n'),
                metadata: d
            }))

            this.store = this.setStore(documents, embeddings)

        }
        const loader = new DirectoryLoader(
            this.urlOrPath,
            {
                ".json": (path) => new JSONLoader(path, "/text"),
                ".jsonl": (path) => new JSONLinesLoader(path, "/html"),
                ".txt": (path) => new TextLoader(path),
                ".pdf": (path) => new PDFLoader(path),
                ".csv": (path) => new CSVLoader(path, "text"),
            }
        );

        const documents = await loader.load();
        this.store = this.setStore(documents, embeddings)

    }

    private async setStore(documents: any[], embeddings?:any) {

        if (documents.length > 1000) {
            try {
                const firts = documents.slice(0, 1000)
                const rest = documents.slice(1000)

                let vectorStore: VectorStoreRetriever<any>

                if (this.store?.fromDocuments) {
                    vectorStore = await this.store.fromDocuments(firts, embeddings)
                }else {
                    vectorStore = await this.store.addDocuments(documents)
                }

                let data = []

                while (data.length < rest.length) {
                    const d = documents.slice(data.length, data.length + 1000)
                    await vectorStore.addDocuments(d)
                    data = data.concat(d)
                    console.log('done data:', data.length)
                }

                return vectorStore
            } catch (error) {
                throw error
            }
        }

        return await this.store.fromDocuments(documents, embeddings)
    }

    async _getRelevantDocuments(
        query: string,
        runManager?: CallbackManagerForRetrieverRun
    ): Promise<Document[]> {
        return await this.store.asRetriever()._getRelevantDocuments(query)
    }
}
