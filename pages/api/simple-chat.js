// 简化版AI Chat API - 只使用OpenAI，确保稳定
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, model = 'gpt-3.5-turbo', context = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: '(演示模式)请配置 API Key 以启用真实调用',
        timestamp: new Date().toISOString()
      });
    }

    // 构建消息
    const messages = [
      ...context.slice(-3),
      { role: 'user', content: message }
    ];

    console.log(`🤖 Simple Chat Request: ${model}`, { 
      messageLength: message.length,
      hasApiKey: !!apiKey
    });

    const startTime = Date.now();

    // 直接调用OpenAI API，不使用复杂的AI SDK
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model === 'Multi-GPT (H1)' ? 'gpt-3.5-turbo' : model,
        messages: messages,
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API Error:', error);
      throw new Error(`OpenAI API failed: ${response.status}`);
    }

    const data = await response.json();
    const responseTime = Date.now() - startTime;
    
    console.log(`✅ Simple Chat Success in ${responseTime}ms`);

    return res.status(200).json({
      success: true,
      data: {
        content: data.choices[0].message.content,
        model: data.model,
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Simple Chat Error:', error);
    return res.status(500).json({
      error: 'AI服务暂时不可用',
      debug: error.message,
      timestamp: new Date().toISOString()
    });
  }
}