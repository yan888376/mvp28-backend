// Multi-GPT双通道API - 支持Gateway和Direct模式
import { v4 as uuidv4 } from 'uuid';

// 模型路由注册表
const MODEL_REGISTRY = {
  // OpenAI 模型
  "gpt-4o-mini": {
    provider: "openai",
    endpoint: "/chat/completions",
    gatewayPath: "/openai/v1",
    directURL: "https://api.openai.com/v1"
  },
  "gpt-4o": {
    provider: "openai", 
    endpoint: "/chat/completions",
    gatewayPath: "/openai/v1",
    directURL: "https://api.openai.com/v1"
  },
  "gpt-3.5-turbo": {
    provider: "openai",
    endpoint: "/chat/completions", 
    gatewayPath: "/openai/v1",
    directURL: "https://api.openai.com/v1"
  },
  
  // Anthropic 模型
  "claude-3-haiku": {
    provider: "anthropic",
    endpoint: "/messages",
    gatewayPath: "/anthropic/v1", 
    directURL: "https://api.anthropic.com/v1"
  },
  "claude-3-sonnet": {
    provider: "anthropic",
    endpoint: "/messages",
    gatewayPath: "/anthropic/v1",
    directURL: "https://api.anthropic.com/v1"
  },
  
  // Google 模型
  "gemini-1.5-flash": {
    provider: "google",
    endpoint: "/v1beta/models/gemini-1.5-flash:generateContent",
    gatewayPath: "/google",
    directURL: "https://generativelanguage.googleapis.com"
  },
  
  // Groq 模型
  "groq-llama3-70b": {
    provider: "groq", 
    endpoint: "/chat/completions",
    gatewayPath: "/groq/v1",
    directURL: "https://api.groq.com/openai/v1"
  }
};

// 获取API配置
function getAPIConfig(model) {
  const modelConfig = MODEL_REGISTRY[model];
  if (!modelConfig) {
    throw new Error(`Unsupported model: ${model}`);
  }
  
  const useGateway = process.env.USE_GATEWAY === 'true';
  const provider = modelConfig.provider;
  
  let config = {
    provider,
    model,
    useGateway,
    baseURL: useGateway ? 
      `${process.env.AI_GATEWAY_URL}${modelConfig.gatewayPath}` : 
      modelConfig.directURL,
    endpoint: modelConfig.endpoint,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  // 设置认证
  if (useGateway) {
    if (!process.env.AI_GATEWAY_TOKEN) {
      throw new Error('AI_GATEWAY_TOKEN not configured');
    }
    config.headers['Authorization'] = `Bearer ${process.env.AI_GATEWAY_TOKEN}`;
  } else {
    const apiKeyMap = {
      openai: process.env.OPENAI_API_KEY,
      anthropic: process.env.ANTHROPIC_API_KEY,
      google: process.env.GOOGLE_API_KEY,
      groq: process.env.GROQ_API_KEY,
      cohere: process.env.COHERE_API_KEY,
      openrouter: process.env.OPENROUTER_API_KEY
    };
    
    const apiKey = apiKeyMap[provider];
    if (!apiKey) {
      throw new Error(`${provider.toUpperCase()}_API_KEY not configured`);
    }
    
    // 不同供应商的认证格式
    if (provider === 'anthropic') {
      config.headers['x-api-key'] = apiKey;
      config.headers['anthropic-version'] = '2023-06-01';
    } else if (provider === 'google') {
      config.headers['x-goog-api-key'] = apiKey;
    } else {
      config.headers['Authorization'] = `Bearer ${apiKey}`;
    }
  }
  
  return config;
}

// 构建请求体
function buildRequestBody(messages, model, provider) {
  const baseBody = {
    model: model,
    max_tokens: 1000,
    temperature: 0.7
  };
  
  if (provider === 'anthropic') {
    // Anthropic格式
    return {
      ...baseBody,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    };
  } else if (provider === 'google') {
    // Google格式
    return {
      contents: messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      })),
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.7
      }
    };
  } else {
    // OpenAI/Groq标准格式
    return {
      ...baseBody,
      messages: messages
    };
  }
}

// 解析响应
function parseResponse(data, provider) {
  if (provider === 'anthropic') {
    return data.content?.[0]?.text || '';
  } else if (provider === 'google') {
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } else {
    // OpenAI/Groq标准格式
    return data.choices?.[0]?.message?.content || '';
  }
}

export default async function handler(req, res) {
  const traceId = uuidv4();
  const startTime = Date.now();
  
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'METHOD_NOT_ALLOWED',
      traceId 
    });
  }

  try {
    const { message, messages, model = 'gpt-4o-mini', context = [] } = req.body;
    
    // 兼容两种请求格式
    let finalMessages = [];
    if (messages) {
      finalMessages = messages;
    } else if (message) {
      finalMessages = [
        ...context.slice(-3), // 限制上下文
        { role: 'user', content: message }
      ];
    } else {
      return res.status(400).json({
        error: 'MISSING_MESSAGE',
        detail: 'Either "message" or "messages" field is required',
        traceId
      });
    }

    console.log(`🚀 [${traceId}] Multi-chat request: model=${model}, messages=${finalMessages.length}`);

    // 获取API配置
    const config = getAPIConfig(model);
    const fullURL = `${config.baseURL}${config.endpoint}`;
    
    console.log(`🎯 [${traceId}] Config: provider=${config.provider}, mode=${config.useGateway ? 'gateway' : 'direct'}, url=${fullURL}`);

    // 构建请求体
    const requestBody = buildRequestBody(finalMessages, model, config.provider);
    
    // 调用上游API
    const response = await fetch(fullURL, {
      method: 'POST',
      headers: config.headers,
      body: JSON.stringify(requestBody),
      timeout: 30000
    });

    const responseData = await response.json();
    const latency = Date.now() - startTime;

    console.log(`📊 [${traceId}] Response: status=${response.status}, latency=${latency}ms`);

    if (!response.ok) {
      console.error(`❌ [${traceId}] Upstream error:`, {
        status: response.status,
        provider: config.provider,
        mode: config.useGateway ? 'gateway' : 'direct',
        error: responseData
      });
      
      return res.status(response.status >= 500 ? 502 : response.status).json({
        error: 'UPSTREAM_ERROR',
        provider: config.provider,
        mode: config.useGateway ? 'gateway' : 'direct',
        status: response.status,
        detail: responseData.error?.message || 'Upstream service error',
        traceId
      });
    }

    // 解析响应内容
    const content = parseResponse(responseData, config.provider);
    
    if (!content) {
      console.error(`❌ [${traceId}] Empty response from ${config.provider}`);
      return res.status(502).json({
        error: 'EMPTY_RESPONSE',
        provider: config.provider,
        detail: 'No content in upstream response',
        traceId
      });
    }

    console.log(`✅ [${traceId}] Success: ${content.length} chars, ${latency}ms`);

    return res.status(200).json({
      success: true,
      data: {
        content,
        model,
        provider: config.provider,
        mode: config.useGateway ? 'gateway' : 'direct',
        latency: `${latency}ms`,
        traceId
      }
    });

  } catch (error) {
    const latency = Date.now() - startTime;
    console.error(`💥 [${traceId}] Error: ${error.message}`);
    
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      detail: error.message,
      latency: `${latency}ms`,
      traceId
    });
  }
}