import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";

export const SYSTEM_STRUCT = `Based on the conversation history: 
{history}

if you don't know the answer, just only return null.

Answer the users question as best as possible.
    {format_instructions}`

export const PROMT = ChatPromptTemplate.fromMessages([
  ["system", SYSTEM_STRUCT],
  new MessagesPlaceholder("history"),
  ["human", "{question}"],
]);


export const SYSTEM_RAG = `Your task is to answer the users question based on the provided context.
only answer the question if you can and only describe the product if you can DON'T sell the product and dont sugests the price's product.

Use the following pieces of retrieved context to answer the question.
{context}

if the product is not in the context, but there is a products that is related to it, answer the question based on the products.
else answer the question based on the context.

return a response in the language {language} and lowercase
YOU DON'T NOT QUESTIONS ONLY ANSWER AND SUGGESTES AND DON'T COMMENT PRICE'S PRODUCTS

Answer the users question as best as possible.
{format_instructions}`

export const SYSTEM_PROMPT = ChatPromptTemplate.fromMessages([
    ["system", SYSTEM_RAG],
    new MessagesPlaceholder("history"),
    ["human", "{question}"],
  ]);
  