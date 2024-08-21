
import { ZodType, ZodTypeDef } from "zod"
import { FactoryModel, Memory } from ".."
import { StructuredOutputParser } from "langchain/output_parsers"

export default async <T>(question: string,
    schema: ZodType<T, ZodTypeDef, T>, model: FactoryModel, state: any) => {
    try {
        const responseSchema = await model.createStructure({
            question,
            language: 'english',
            history: await Memory.getMemory(state, 4),
            format_instructions: new StructuredOutputParser(schema).getFormatInstructions()
        }, schema)

        Memory.memory({ user: question, assistant: JSON.stringify(responseSchema) }, state)
        return responseSchema
    } catch (error) {
        throw error
    }
}
