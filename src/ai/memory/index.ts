import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages"

type History = [HumanMessage, SystemMessage] | any[]
type RoleHistory = { user: string, assistant: string }

class MemoryHistory {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    memory = async (inside: RoleHistory, _state: any) => {
        let memory = _state.get('memory') ?? []
        memory.push(
            new HumanMessage({
                content: [
                    {
                        type: 'text',
                        text: inside.user
                    }
                ]
            }),
            new AIMessage({
                content: [
                    {
                        type: 'text',
                        text: inside.assistant
                    }
                ]
            })
        )
        await _state.update({ memory })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getMemory = async (_state: any, k = 4) => {
        const memory = _state.get('memory') as History[] ?? []
        const limitHistory = memory.slice(-k)
        
        await _state.update({ memory: limitHistory })
        return limitHistory.flat()
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    clearMemory = async (_state: any) => {
        try {
            _state['memory'].clear()
        } catch (_) {
            _state['memory'] = []
        }
    }
}

export default new MemoryHistory()