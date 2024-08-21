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
  tables?: any,
  activeTable?: any,
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
// Daily activities log
export interface DailyActivity {
  id: string;
  date: Date;
  activity: string;
  duration: number; // in minutes
  category: string;
  notes?: string;
}

// Research activities log
export interface ResearchActivity {
  id: string;
  date: Date;
  topic: string;
  summary: string;
  sources: string[];
  key_findings: string[];
  next_steps?: string;
}

// Game states
export interface GameState {
  id: string;
  game_name: string;
  player_id: string;
  current_level: number;
  score: number;
  last_played: Date;
  saved_state: object; // This could be a more specific type depending on your game structure
}

// Global shared table
export interface GlobalEntry {
  id: string;
  key: string;
  value: string | number | boolean | object;
  last_updated: Date;
  created_by: string;
  visibility: 'public' | 'private' | 'group';
}

// Union type for all table types
export type TableEntry = DailyActivity | ResearchActivity | GameState | GlobalEntry;

// Enum for table names
export enum TableName {
  DAILY = 'DAILY',
  RESEARCH = 'RESEARCH',
  GAMES = 'GAMES',
  GLOBAL = 'GLOBAL'
}

// Helper type to map table names to their respective entry types
//
export type Usertype = {
  _id: { contract: string, id: number },
  name: string,
  image: string,
  tgChats: number[],
  owner: string
}

// Define the structure of the chat document
export interface ChatType {
  _id: number; // Chat ID
  profileIds: {
    contract: string;
    id: number;
  }[]; // Array of profile IDs subscribed to the chat
}
export type TableTypeMap = {
  [TableName.DAILY]: DailyActivity;
  [TableName.RESEARCH]: ResearchActivity;
  [TableName.GAMES]: GameState;
  [TableName.GLOBAL]: GlobalEntry;
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

