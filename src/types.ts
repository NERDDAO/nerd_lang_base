import { EVENTS } from "@builderbot/bot"
import { TFlow } from "@builderbot/bot/dist/types"
import { Embeddings } from "@langchain/core/embeddings"
import { BaseChatModel } from "@langchain/core/language_models/chat_models"
import { BaseRetriever, BaseRetrieverInput } from "@langchain/core/retrievers"
import { VectorStore } from "@langchain/core/vectorstores"
import { AxiosRequestConfig } from "axios"
import { ZodType, ZodTypeDef } from "zod"

export type Eventskrd = keyof typeof EVENTS

export type Callbacks = {
  beforeStart?: <P, B>(flow: TFlow<P, B>) => TFlow<P, B>,
  afterEnd?: <P, B>(flow: TFlow<P, B>) => TFlow<P, B>,
  onFailure?: (error: Error) => void
}

export type AiModel = { modelName: ModelName, args?: ModelArgs } | BaseChatModel

export type ModelArgs = {
  modelName: string,
  maxOutputTokens?: number,
  apikey?: string,
  temperature?: number,
  topK?: number
  topP?: number,
  [key: string]: any
}

export type Store = {
  conf: {
    urlOrPath: string,
    schema?: string[],
    store?: VectorStore,
    embeddings?: Embeddings,
    httpConf?: AxiosRequestConfig,
  }
}

export type Retriever = {
  searchFn?: (query: string) => Promise<any[]>,
  fields?: BaseRetrieverInput
}

export type ModelName = 'gemini' | 'openai' | 'cloudflare'

export type InvokeParams = {
  question: string,
  language: string,
  history: any,
  search?: string,
  persona?: string,
  format_instructions?: string
} | {
  [key: string]: string
}

export type ContextOpts = {
  similarityThreshold: number
  k: number,
  path: string
}

export type RunnableConf = {
  prompt?: string,
  answerSchema: ZodType<any, ZodTypeDef, any>,
  contextual?: {
    contextOpts?: { k: number, similarityThreshold: number, embeddings?: Embeddings },
    retriever: BaseRetriever
  },
  customContextual?: any;
  aiModel?: AiModel
}

export interface Activity {
  id: string
  name: string
  isActive: boolean
  title: string
  description: string
  detailedDescription: string
  categories: Category[]
  timeRange: TimeRange
  primaryPlatform: Platform
  tags: string[]
  platforms: Platform[]
  subActivities: SubActivity[]
  participants: Participant[]
}

export interface Category {
  id: string
  name: string
  values: string[]
}

export interface TimeRange {
  start: Date
  end: Date
}

export interface Platform {
  name: string
  url?: string
}

export interface SubActivity {
  id: string
  title: string
  isActive: boolean
  requiredResources: RequiredResource[]
  duration: Duration
  participants: Participant[]
}

export interface RequiredResource {
  name: string
  quantity: number
}

export interface Duration {
  amount: number
  unit: 'minutes' | 'hours' | 'days'
}

export interface Participant {
  id: string
  name: string
  role: string
  status: 'active' | 'inactive' | 'pending'
  contactInfo: ContactInfo
}

export interface ContactInfo {
  email: string
  additionalPlatforms?: { [key: string]: string }
}

