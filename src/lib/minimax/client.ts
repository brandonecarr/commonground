import OpenAI from 'openai'

export const MINIMAX_MODEL = 'MiniMax-M2.5-highspeed'

let _minimax: OpenAI | null = null

export function getMinimax(): OpenAI {
  if (!_minimax) {
    _minimax = new OpenAI({
      apiKey: process.env.MINIMAX_API_KEY!,
      baseURL: 'https://api.minimax.io/v1',
    })
  }
  return _minimax
}
