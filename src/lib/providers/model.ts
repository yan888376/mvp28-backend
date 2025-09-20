// AI Model Provider abstraction layer
import OpenAI from 'openai'
import { config } from '../config'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ChatResponse {
  content: string
  model: string
  latencyMs: number
  tokenUsage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export abstract class ModelProvider {
  abstract chat(messages: ChatMessage[], model?: string): Promise<ChatResponse>
  abstract chatStream?(messages: ChatMessage[], model?: string): AsyncGenerator<string>
}

export class OpenAIProvider extends ModelProvider {
  private client: OpenAI

  constructor() {
    super()
    this.client = new OpenAI({
      apiKey: config.ai.openaiApiKey,
      timeout: config.ai.timeoutMs,
    })
  }

  async chat(messages: ChatMessage[], model = 'gpt-4o-mini'): Promise<ChatResponse> {
    const startTime = Date.now()
    
    // 验证 API Key
    if (!config.ai.openaiApiKey || config.ai.openaiApiKey === 'sk-your-openai-api-key-here') {
      throw new Error('OpenAI API key not configured')
    }

    // 优化上下文管理：限制消息数量和总token数
    const optimizedMessages = this.optimizeMessageContext(messages)
    
    console.log(`🤖 调用 OpenAI API: model=${model}, messages=${optimizedMessages.length}条 (原始${messages.length}条)`)
    
    // 实现重试机制
    return await this.executeWithRetry(async () => {
      const response = await this.client.chat.completions.create({
        model,
        messages: optimizedMessages,
        max_tokens: this.calculateMaxTokens(optimizedMessages, model),
        temperature: config.ai.temperature,
        // 添加额外的安全参数
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
        // 防止有害内容
        moderation: true,
      })

      const latencyMs = Date.now() - startTime
      const choice = response.choices[0]
      
      if (!choice?.message?.content) {
        throw new Error('No content in OpenAI response')
      }

      // 检查内容质量
      if (choice.message.content.trim().length < 2) {
        throw new Error('OpenAI response too short')
      }

      console.log(`✅ OpenAI API 成功: ${latencyMs}ms, tokens=${response.usage?.total_tokens}`)

      return {
        content: choice.message.content,
        model: response.model,
        latencyMs,
        tokenUsage: response.usage ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        } : undefined,
      }
    }, model, startTime)
  }

  // 智能上下文优化：保留最重要的消息
  private optimizeMessageContext(messages: ChatMessage[]): ChatMessage[] {
    const maxMessages = 20 // 最大消息数
    const maxContextTokens = 3000 // 大约的token限制
    
    if (messages.length <= maxMessages) {
      return messages
    }

    // 保留系统消息和最近的对话
    const systemMessages = messages.filter(m => m.role === 'system')
    const conversationMessages = messages.filter(m => m.role !== 'system')
    
    // 保留最近的对话
    const recentMessages = conversationMessages.slice(-maxMessages + systemMessages.length)
    
    return [...systemMessages, ...recentMessages]
  }

  // 动态计算最大token数
  private calculateMaxTokens(messages: ChatMessage[], model: string): number {
    // 估算输入token数 (粗略估算: 1个英文词≈1.3个token，1个中文字≈2个token)
    const estimatedInputTokens = messages.reduce((total, msg) => {
      const words = msg.content.split(/\s+/).length
      const chineseChars = (msg.content.match(/[\u4e00-\u9fff]/g) || []).length
      return total + words * 1.3 + chineseChars * 2
    }, 0)

    // 根据模型调整token限制
    const modelLimits = {
      'gpt-4o-mini': 128000,
      'gpt-4o': 128000,
      'gpt-4': 8192,
      'gpt-3.5-turbo': 4096
    }

    const maxModelTokens = modelLimits[model as keyof typeof modelLimits] || 4096
    const maxOutputTokens = Math.min(
      config.ai.maxTokens,
      Math.max(500, maxModelTokens - estimatedInputTokens - 500) // 保留500 token缓冲
    )

    return maxOutputTokens
  }

  // 重试机制实现
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    model: string,
    startTime: number,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: any
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error: any) {
        lastError = error
        
        console.log(`❌ OpenAI API 尝试 ${attempt}/${maxRetries} 失败:`, {
          message: error.message,
          status: error.status,
          code: error.code,
          attempt
        })
        
        // 判断是否应该重试
        if (!this.shouldRetry(error, attempt, maxRetries)) {
          break
        }
        
        // 指数退避延迟
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000)
        console.log(`⏳ ${delay}ms 后重试...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    // 所有重试都失败，返回降级响应
    const latencyMs = Date.now() - startTime
    return this.createFallbackResponse(lastError, latencyMs) as T
  }

  // 判断是否应该重试
  private shouldRetry(error: any, attempt: number, maxRetries: number): boolean {
    if (attempt >= maxRetries) return false
    
    // 这些错误不应该重试
    const nonRetryableErrors = [401, 402, 403] // 认证、账单、权限错误
    if (nonRetryableErrors.includes(error.status)) {
      return false
    }
    
    // 这些错误可以重试
    const retryableErrors = [429, 500, 502, 503, 504] // 频率限制、服务器错误
    const networkErrors = ['ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT']
    
    return retryableErrors.includes(error.status) || 
           networkErrors.includes(error.code) ||
           error.message?.includes('timeout')
  }

  // 创建降级响应
  private createFallbackResponse(error: any, latencyMs: number): ChatResponse {
    // 详细错误日志
    console.error('❌ OpenAI API 最终失败:', {
      message: error.message,
      status: error.status,
      code: error.code,
      type: error.type,
      latencyMs
    })
    
    // 不同错误类型的处理
    let fallbackMessage = '抱歉，AI服务暂时不可用，请稍后重试。'
    
    if (error.status === 401) {
      fallbackMessage = '❌ API密钥无效，请检查配置'
      console.error('🔑 请检查 OPENAI_API_KEY 环境变量配置')
    } else if (error.status === 429) {
      fallbackMessage = '⚠️ API调用频率超限，请稍后重试'
    } else if (error.status === 402) {
      fallbackMessage = '💳 OpenAI账户余额不足，请充值'
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      fallbackMessage = '🌐 网络连接失败，请检查网络设置'
    } else if (error.message?.includes('timeout')) {
      fallbackMessage = '⏱️ API响应超时，请稍后重试'
    }
    
    return {
      content: fallbackMessage,
      model: 'fallback',
      latencyMs,
    }
  }

  // Future: Stream implementation
  async *chatStream(messages: ChatMessage[], model = 'gpt-4o-mini'): AsyncGenerator<string> {
    const stream = await this.client.chat.completions.create({
      model,
      messages,
      max_tokens: config.ai.maxTokens,
      temperature: config.ai.temperature,
      stream: true,
    })

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content
      if (content) {
        yield content
      }
    }
  }
}

// Provider factory
export function createModelProvider(): ModelProvider {
  switch (config.ai.provider) {
    case 'openai':
      return new OpenAIProvider()
    default:
      throw new Error(`Unsupported AI provider: ${config.ai.provider}`)
  }
}