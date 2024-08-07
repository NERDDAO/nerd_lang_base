
import { OllamaEmbeddings } from "@langchain/community/embeddings/ollama";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import {
	JSONLoader,
	JSONLinesLoader,
} from "langchain/document_loaders/fs/json";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { CSVLoader } from "langchain/document_loaders/fs/csv";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { ChromaClient } from 'chromadb'
const client = new ChromaClient({
	baseUrl: "http://provider.a6000.mon.obl.akash.pub:32709"
});
const collection = await client.getOrCreateCollection({
	name: "my_collection",
});

const loader = new DirectoryLoader(
	"./files",
	{
		".json": (path) => new JSONLoader(path, "/texts"),
		".jsonl": (path) => new JSONLinesLoader(path, "/html"),
		".pdf": (path) => new PDFLoader(path),
		".csv": (path) => new CSVLoader(path, "text"),
	}
);
const docs = await loader.load();
console.log({ docs });
const textSplitter = new RecursiveCharacterTextSplitter({
	chunkSize: 1000,
	chunkOverlap: 200,
});

const splitDocs = textSplitter.map({ ids, docs });

const embeddings = new OllamaEmbeddings({
	model: "nomic-embed-text", // default value
	baseUrl: "http://localhost:11434", // default value
	requestOptions: {
		useMMap: true,
		numThread: 6,
		numGpu: 1,
	},
});

const vectorStore = await Chroma.fromDocuments(splitDocs, embeddings, {
	collectionName: "state_of_the_union",
});



const documents = ["Hello World!", "Bye Bye"];

//const documentEmbeddings = await embeddings.embedDocuments(splitDocs);

/* Create vector store and index the docs
const vectorStore = await Chroma.fromDocuments(splitDocs, embeddings, {
	collectionName: "a-test-collection",
	persist_directory: "./",
	url: "http://provider.a6000.mon.obl.akash.pub:32709", // Optional, will default to this value
	collectionMetadata: {
		"hnsw:space": "cosine",
	}, // Optional, can be used to specify the distance method of the embedding space https://docs.trychroma.com/usage-guide#changing-the-distance-function
});
*/


console.log(vectorStore);
