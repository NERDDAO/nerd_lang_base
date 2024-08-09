
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import {
	JSONLoader,
	JSONLinesLoader,
} from "langchain/document_loaders/fs/json";
import { TextLoader } from "langchain/document_loaders/fs/text"
import { CSVLoader } from "langchain/document_loaders/fs/csv";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import "dotenv/config"

const embeddings = new HuggingFaceInferenceEmbeddings({
	apiKey: process.env.HUGGINGFACEHUB_API_KEY, // In Node.js defaults to process.env.HUGGINGFACEHUB_API_KEYconst client = new ChromaClient({
});


const loader = new DirectoryLoader(
	"./files",
	{
		".pdf": (path) => new PDFLoader(path),
		".txt": (path) => new TextLoader(path, "text"),
	}
);
const docs = await loader.load();
console.log({ docs });
const textSplitter = new RecursiveCharacterTextSplitter({
	chunkSize: 1000,
	chunkOverlap: 0,
});

const splitDocs = await textSplitter.splitDocuments(docs);




const documents = ["Hello World!", "Bye Bye"];

//const documentEmbeddings = await embeddings.embedDocuments(splitDocs);

//Create vector store and index the docs
const vectorStore = await Chroma.fromDocuments(splitDocs, embeddings, {
	collectionName: "a-test-collection-3-2",
	persist_directory: "./",
	url: "http://chroma:8000", // Optional, will default to this value
	collectionMetadata: {
		"hnsw:space": "cosine",
	}, // Optional, can be used to specify the distance method of the embedding space https://docs.trychroma.com/usage-guide#changing-the-distance-function
});
/**/

const query = await vectorStore.similaritySearchWithScore("foo")


console.log(query);
