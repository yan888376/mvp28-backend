// Multi-GPT (H1) - 多模型AI编排服务
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

// 18个API提供商的密钥配置 (从环境变量获取)
const API_PROVIDERS = {
  // 1. OpenAI GPT-5
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo']
  },
  
  // 2. Google Gemini
  google: {
    apiKey: process.env.GOOGLE_API_KEY,
    models: ['gemini-1.5-flash', 'gemini-1.5-pro']
  },
  
  // 3. Anthropic Claude
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    models: ['claude-3-sonnet', 'claude-3-haiku']
  },
  
  // 4. Groq (低延迟)
  groq: {
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
    models: ['llama-3.1-70b-versatile', 'mixtral-8x7b-32768']
  },

  // 5. Cohere
  cohere: {
    apiKey: process.env.COHERE_API_KEY,
    baseURL: 'https://api.cohere.ai/v1',
    models: ['command-r-plus', 'command-r']
  },
  
  // 6. OpenRouter (多模型聚合)
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
    models: ['microsoft/wizardlm-2-8x22b', 'meta-llama/llama-3.1-405b']
  }
};

// 模型路由 - 根据请求选择最佳API
const getProviderForModel = (modelName) => {
  // GPT系列 -> OpenAI
  if (modelName.includes('gpt') || modelName.includes('GPT')) {
    return {
      provider: openai,
      config: { apiKey: API_PROVIDERS.openai.apiKey },
      model: 'gpt-3.5-turbo'
    };
  }
  
  // Gemini -> Google
  if (modelName.includes('gemini') || modelName.includes('Gemini')) {
    return {
      provider: google,
      config: { apiKey: API_PROVIDERS.google.apiKey },
      model: 'gemini-1.5-flash'
    };
  }
  
  // Claude -> Anthropic
  if (modelName.includes('claude') || modelName.includes('Claude')) {
    return {
      provider: anthropic,
      config: { apiKey: API_PROVIDERS.anthropic.apiKey },
      model: 'claude-3-haiku-20240307'
    };
  }
  
  // Multi-GPT (H1) -> 智能路由到最快的API
  if (modelName.includes('Multi-GPT') || modelName.includes('H1')) {
    return {
      provider: openai,
      config: { 
        apiKey: API_PROVIDERS.groq.apiKey,
        baseURL: API_PROVIDERS.groq.baseURL
      },
      model: 'llama-3.1-70b-versatile'
    };
  }
  
  // 默认使用OpenAI
  return {
    provider: openai,
    config: { apiKey: API_PROVIDERS.openai.apiKey },
    model: 'gpt-3.5-turbo'
  };
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, model = 'Multi-GPT (H1)', context = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log(`🤖 Multi-GPT Request: ${model}`, { 
      messageLength: message.length,
      contextLength: context.length,
      hasApiKey: !!API_PROVIDERS.openai.apiKey,
      apiKeyLength: API_PROVIDERS.openai.apiKey ? API_PROVIDERS.openai.apiKey.length : 0
    });

    // 选择最佳API提供商
    const { provider, config, model: selectedModel } = getProviderForModel(model);
    
    const startTime = Date.now();
    
    // 构建消息
    const messages = [
      ...context.slice(-3), // 只保留最近3条上下文
      { role: 'user', content: message }
    ];

    // 调用AI API
    const result = await streamText({
      model: provider(selectedModel, config),
      messages: messages,
      maxTokens: 300,
      temperature: 0.5,
    });

    const responseTime = Date.now() - startTime;
    const fullText = await result.text;
    
    console.log(`✅ Multi-GPT response: ${selectedModel} in ${responseTime}ms`);

    return res.status(200).json({
      success: true,
      data: {
        content: fullText,
        model: `${model} → ${selectedModel}`,
        provider: config.baseURL ? 'Custom' : 'Standard',
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Multi-GPT Error:', error);
    
    return res.status(500).json({
      error: 'Multi-GPT service temporarily unavailable',
      debug: {
        message: error.message,
        type: error.constructor.name
      },
      timestamp: new Date().toISOString()
    });
  }
}