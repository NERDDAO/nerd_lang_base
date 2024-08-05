import "dotenv/config"
import { ContextualCompressionRetriever } from "langchain/retrievers/contextual_compression";
import { EmbeddingsFilter } from "langchain/retrievers/document_compressors/embeddings_filter";
import { DocumentCompressorPipeline } from "langchain/retrievers/document_compressors";
import { Embeddings } from "@langchain/core/embeddings";
import { BaseRetriever } from "@langchain/core/retrievers";
import { FastEmbedding } from "@builderbot-plugins/fast-embedding"

export default class ContextualCompression {
    private contextual: ContextualCompressionRetriever

    constructor(
        private retriever: BaseRetriever,
        private embeddings?: Partial<
        {
            model: Embeddings
            similarityThreshold: number,
            k: number
        }>) {
        this.init();
    }

    private init () {
        this.contextual = new ContextualCompressionRetriever({
            baseCompressor: this.compressorPipeline,
            baseRetriever: this.retriever,
        });
    }

    private get embeddingFilter() {
        return new EmbeddingsFilter({
            embeddings: this?.embeddings?.model || new FastEmbedding('AllMiniLML6V2'),
            similarityThreshold: this?.embeddings?.similarityThreshold || 0.5,
            k: this?.embeddings?.k || 10
        });
    }

    private get compressorPipeline() {
        return new DocumentCompressorPipeline({
            transformers: [this.embeddingFilter]
        });
    } 

    invoke = async (query: string) => {
        return await this.contextual.getRelevantDocuments(
            query
        );
    }
}