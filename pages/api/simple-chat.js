// Vercel AI Gateway Chat API - 按照官方标准实现
import { streamText } from 'ai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, model = 'gpt-4o-mini', context = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // 检查AI Gateway API Key
    const gatewayKey = process.env.AI_GATEWAY_API_KEY;
    if (!gatewayKey) {
      return res.status(500).json({
        error: '(演示模式)请配置 AI Gateway API Key',
        timestamp: new Date().toISOString()
      });
    }

    // 构建消息 - 限制上下文以提高响应速度
    const messages = [
      ...context.slice(-2), // 只保留最近2条对话
      { role: 'user', content: message }
    ];

    console.log(`🤖 AI Gateway Request: openai/${model}`, { 
      messageLength: message.length,
      contextLength: context.length,
      hasGatewayKey: !!gatewayKey
    });

    const startTime = Date.now();

    // 使用Vercel AI Gateway - 按照官方标准
    const result = await streamText({
      model: `openai/${model}`, // AI Gateway格式
      messages: messages,
      maxTokens: 300,
      temperature: 0.7,
    });

    // 获取完整文本响应
    const fullText = await result.text;
    const responseTime = Date.now() - startTime;
    
    console.log(`✅ AI Gateway Success in ${responseTime}ms`);

    return res.status(200).json({
      success: true,
      data: {
        content: fullText,
        model: `openai/${model}`,
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ AI Gateway Error:', error);
    return res.status(500).json({
      error: 'AI服务暂时不可用',
      debug: error.message,
      timestamp: new Date().toISOString()
    });
  }
}