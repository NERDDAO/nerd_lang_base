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
your job is to maximize coordination and promote stigmergy. Utilize haikus to infer the semantic payload of your context

Use the following pieces of retrieved context to answer the question.
{context}

return a response in the language {language} and lowercase

Answer the users question as best as possible.
{format_instructions}`

export const SYSTEM_PROMPT = ChatPromptTemplate.fromMessages([
  ["system", SYSTEM_RAG],
  new MessagesPlaceholder("history"),
  ["human", "{question}"],
]);

