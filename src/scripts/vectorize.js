import { FastEmbedding } from "@builderbot-plugins/fast-embedding";
import { Chroma } from "@langchain/community/vectorstores/chroma"
import { CSVLoader } from "langchain/document_loaders/fs/csv";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import {
	JSONLoader,
} from "langchain/document_loaders/fs/json";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { PDFLoader } from "langchain/document_loaders/fs/pdf"
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter"


const loadFile = async (dir) => {
	if (!fs.existsSync(dir)) throw new Error(`[ERROR] no existe el directorio: ${dir}`)

	const loader = new DirectoryLoader(
		dir,
		{
			".json": (path) => new JSONLoader(path, "/texts"),
			".pdf": (path) => new PDFLoader(path),
			".txt": (path) => new TextLoader(path),
			".csv": (path) => new CSVLoader(path, "text"),
		}
	);

	return await loader.loadAndSplit(
		new RecursiveCharacterTextSplitter({
			separators: ["\n\n", "\n", "\r"],
			chunkSize: 100,
			chunkOverlap: 0,
		})
	)
}

export const run = async () => {
	const dir = "data";

	//const docs = await loadFile("files")
	const loader = new PDFLoader("./files/GreenPaper.pdf");
	const docs = await loader.load()
	console.log(docs)
	/*const table = await db.createTable("vectors", [
		{ vector: Array(384), text: "sample", source: "a" },
	]);*/
	console.log("keep going")

	const vectorStore = await Chroma.fromDocuments(
		docs,
		new FastEmbedding("AllMiniLML6V2"),
		{ collectionName: "books23" }
	);

	console.log("keep going", vectorStore)
	const resultOne = await vectorStore.similaritySearch("hello world", 1);
	console.log(resultOne);

	// [
	//   Document {
	//     pageContent: 'Foo\nBar\nBaz\n\n',
	//     metadata: { source: 'src/document_loaders/example_data/example.txt' }
	//   }
	// ]
};

run();

