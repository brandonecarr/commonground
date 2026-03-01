import OpenAI from 'openai'

export const minimax = new OpenAI({
  apiKey: process.env.MINIMAX_API_KEY!,
  baseURL: 'https://api.minimax.io/v1',
})

export const MINIMAX_MODEL = 'MiniMax-M2.5-highspeed'
