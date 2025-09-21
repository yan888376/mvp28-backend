// AI Chat API using Vercel AI SDK
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export default async function handler(req, res) {
  // 检查API密钥配置
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({
      error: '(演示模式)请配置 API Key 以启用真实调用',
      debug: {
        availableEnvVars: Object.keys(process.env).filter(key => key.includes('API')),
        message: 'Missing AI_GATEWAY_API_KEY or OPENAI_API_KEY'
      },
      timestamp: new Date().toISOString()
    });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, model = 'gpt-4o-mini', context = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Prepare messages for AI model
    const messages = [
      ...context.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    console.log(`📡 AI Chat Request: openai/${model}`, { 
      messageCount: messages.length,
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey ? apiKey.length : 0
    });

    const startTime = Date.now();
    
    // Use Vercel AI SDK with OpenAI provider - 优化响应速度
    const result = await streamText({
      model: openai('gpt-3.5-turbo', { apiKey }), // 强制使用更快的模型
      messages: messages.slice(-1), // 只保留最后一条消息，减少上下文
      maxTokens: 200, // 进一步减少到200 tokens
      temperature: 0.3, // 降低温度提高响应速度
    });

    const responseTime = Date.now() - startTime;
    console.log(`✅ AI response generated successfully in ${responseTime}ms`);

    // Convert the streaming result to a simple text response for our current miniprogram client
    const fullText = await result.text;
    
    return res.status(200).json({
      success: true,
      data: {
        content: fullText,
        model: model,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Chat API Error:', error);
    
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