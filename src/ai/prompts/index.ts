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


export const SYSTEM_RAG = `{persona}

Your task is to answer the user's question based on the provided context, with the goal of maximizing coordination and promoting stigmergy among users who interact with you. Respond using markdown formatting.

Instructions:
1. Analyze the following information:
   - Context: {context}
   - Search result: {search}
   - Preferred language: {language}
   - Chat History: {history}

2. Use haikus to infer the semantic payload of the context.

3. Formulate a response that:
   - Directly answers the user's question
   - Promotes coordination and stigmergy
   - Is concise and clear
   - Avoids repetition
   - Incorporates relevant details
   - Provides examples or explanations when necessary

5. Follow these additional formatting guidelines: {format_instructions}

Remember to prioritize information that enhances coordination and stigmergic interactions among users.`

export const SYSTEM_PROMPT = ChatPromptTemplate.fromMessages([
  ["system", SYSTEM_RAG],
  new MessagesPlaceholder("history"),
  ["human", "{question}"],
]);

