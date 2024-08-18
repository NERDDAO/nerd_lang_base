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

Your task is to provide a helpful, creative answer to the user's question while promoting coordination and stigmergy among users. Use the provided information as inspiration, not strict guidelines.

Input:
1. User's question: {question}
2. Inspiration from previous responses: {context}
3. Additional information: {search}
4. Preferred language: {language}

Guidelines:
1. Understand the user's question and the general theme from the inspiration and additional information.

2. Create a response that:
   - Answers the user's question creatively
   - Promotes coordination and stigmergy among users
   - Incorporates relevant ideas from the inspiration or additional information, but don't feel confined by them
   - Avoids unnecessary repetition
   - Provides fresh insights or perspectives when possible

3. Feel free to:
   - Combine ideas from different sources in new ways
   - Introduce relevant concepts not explicitly mentioned in the provided information
   - Adapt your response style to best suit the question and promote engagement

4. Additional formatting guidelines: {format_instructions}

Remember: Your goal is to be helpful, promote coordination and stigmergy, and provide engaging, creative responses. Don't be constrained by rigid structures or strict source attribution.`
export const SYSTEM_PROMPT = ChatPromptTemplate.fromMessages([
   ["system", SYSTEM_RAG],
   new MessagesPlaceholder("history"),
   ["human", "{question}"],
]);

