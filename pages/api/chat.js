// AI Chat API using Vercel AI Gateway - 官方标准实现
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
        debug: {
          availableEnvVars: Object.keys(process.env).filter(key => key.includes('API')),
          message: 'Missing AI_GATEWAY_API_KEY'
        },
        timestamp: new Date().toISOString()
      });
    }

    // 构建消息 - 优化上下文处理
    const messages = [
      ...context.slice(-2).map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    console.log(`📡 AI Gateway Request: openai/${model}`, { 
      messageCount: messages.length,
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

    const responseTime = Date.now() - startTime;
    console.log(`✅ AI Gateway response in ${responseTime}ms`);

    // 获取完整文本响应
    const fullText = await result.text;
    
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
    
    // 详细错误信息用于调试
    let errorMessage = 'AI service temporarily unavailable';
    let debugInfo = {
      message: error.message,
      stack: error.stack,
      code: error.code
    };
    
    if (error.message?.includes('API key')) {
      errorMessage = 'API configuration error';
    } else if (error.message?.includes('quota')) {
      errorMessage = 'Service quota exceeded';
    }

    return res.status(500).json({
      error: errorMessage,
      debug: debugInfo,
      timestamp: new Date().toISOString()
    });
  }
}