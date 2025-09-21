// 简化版聊天API - 纯JavaScript，确保Vercel兼容
const OpenAI = require('openai')

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export default async function handler(req, res) {
  // 只允许POST请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // 解析请求数据
    const { message, model = 'gpt-4o-mini', context = [] } = req.body

    if (!message) {
      return res.status(400).json({ error: 'Message is required' })
    }

    console.log('🤖 处理聊天请求:', { message, model })

    // 构建消息数组
    const messages = [
      ...context,
      { role: 'user', content: message }
    ]

    // 调用OpenAI API
    const startTime = Date.now()
    const completion = await openai.chat.completions.create({
      model,
      messages,
      max_tokens: 2000,
      temperature: 0.7,
    })

    const latencyMs = Date.now() - startTime
    const content = completion.choices[0]?.message?.content

    if (!content) {
      throw new Error('No response from AI')
    }

    console.log('✅ AI响应成功:', { latencyMs, model })

    // 返回响应
    return res.status(200).json({
      success: true,
      response: content,
      model: completion.model,
      latencyMs,
      usage: completion.usage
    })

  } catch (error) {
    console.error('❌ 聊天API错误:', error)
    
    // 返回友好的错误响应
    let errorMessage = '抱歉，AI服务暂时不可用，请稍后重试。'
    
    if (error.status === 401) {
      errorMessage = 'API密钥配置错误'
    } else if (error.status === 429) {
      errorMessage = 'API调用频率超限，请稍后重试'
    } else if (error.status === 402) {
      errorMessage = 'OpenAI账户余额不足'
    }

    return res.status(200).json({
      success: true,
      response: errorMessage,
      model: 'fallback',
      latencyMs: 0
    })
  }
}