// 简化版AI Chat API - 使用原生OpenAI，无需认证
import OpenAI from 'openai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, model = 'gpt-4o-mini', context = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // 检查OpenAI API Key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === 'sk-your-openai-api-key-here') {
      return res.status(500).json({
        error: '(演示模式)请配置 API Key 以启用真实调用',
        timestamp: new Date().toISOString()
      });
    }

    // 构建消息
    const messages = [
      ...context.slice(-3), // 只保留最近3条上下文
      { role: 'user', content: message }
    ];

    console.log(`🤖 Simple Chat Request: ${model}`, { 
      messageLength: message.length,
      hasApiKey: !!apiKey
    });

    const startTime = Date.now();

    // 创建OpenAI客户端
    const openai = new OpenAI({
      apiKey: apiKey,
      timeout: 30000,
    });

    // 调用OpenAI API
    const response = await openai.chat.completions.create({
      model: model,
      messages: messages,
      max_tokens: 300,
      temperature: 0.7,
    });

    const responseTime = Date.now() - startTime;
    
    console.log(`✅ Simple Chat Success in ${responseTime}ms`);

    return res.status(200).json({
      success: true,
      data: {
        content: response.choices[0].message.content,
        model: response.model,
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Simple Chat Error:', error);
    
    let errorMessage = 'AI服务暂时不可用';
    if (error.status === 401) {
      errorMessage = 'API密钥无效';
    } else if (error.status === 429) {
      errorMessage = 'API调用频率超限';
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = '网络连接失败';
    }
    
    return res.status(500).json({
      error: errorMessage,
      debug: error.message,
      timestamp: new Date().toISOString()
    });
  }
}