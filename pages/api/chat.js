// AI Chat API using Vercel AI Gateway
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

    // Prepare messages for AI model
    const messages = [
      ...context.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    console.log(`📡 AI Chat Request: openai/${model}`, { messageCount: messages.length });

    // Use Vercel AI Gateway with correct model format
    const result = await streamText({
      model: `openai/${model}`,
      messages: messages,
      maxTokens: 1000,
      temperature: 0.7,
    });

    console.log('✅ AI response generated successfully');

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