import { FastEmbedding } from "@builderbot-plugins/fast-embedding";
import { LanceDB } from "@langchain/community/vectorstores/lancedb";
import { loadFile } from "../../utils/loaders";
import { Document } from "@langchain/core/documents";
import * as lancedb from "@lancedb/lancedb";



export default class StoreManager {

    static async init(path?: string) {
        const embeddingInstance = new FastEmbedding('AllMiniLML6V2')
        const uri = "data/sample-lancedb";
        const db = await lancedb.connect(uri);
        //const db = await connect(`./${tableName}.db`);
        let table: lancedb.Table
        let vectorStore: LanceDB

        try {
            table = await db.openTable(uri);

            vectorStore = new LanceDB(embeddingInstance, {
                table
            })
        } catch (_) {
            table = await db.createTable(uri,
                [{ vector: Array(await embeddingInstance.getDimension()), text: "foo", id: 0 }]);

            const docs = await loadFile(path || './data')
            
            vectorStore = await LanceDB.fromDocuments(
                docs.map((doc, id) => new Document({
                    pageContent: doc.pageContent,
                    metadata: {
                        id
                    }
                })),
                embeddingInstance, {
                table
            })

        }

        return vectorStore
    }
}
