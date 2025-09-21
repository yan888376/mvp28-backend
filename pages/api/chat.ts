// AI Chat API
import { NextApiRequest, NextApiResponse } from 'next'
import Joi from 'joi'
import { withAuth } from '@/lib/auth'
import { createModelProvider, ChatMessage } from '@/lib/providers/model'
import { checkRateLimit, getRateLimitKey } from '@/lib/rateLimiter'
import { getUserQuotaStatus, incrementUserQuota, calculateMessageCost } from '@/lib/quota'
import { prisma } from '@/lib/prisma'
import { 
  withErrorHandling, 
  withPerformanceMonitoring,
  BusinessErrors,
  sendSuccess,
  LogLevel,
  log
} from '@/lib/errorHandler'

const schema = Joi.object({
  message: Joi.string().min(1).max(2000).required(),
  model: Joi.string().optional().default('gpt-4o-mini'),
  context: Joi.array().items(
    Joi.object({
      role: Joi.string().valid('user', 'assistant', 'system').required(),
      content: Joi.string().required(),
    })
  ).optional(),
})

async function chatHandler(req: NextApiRequest & { user: any }, res: NextApiResponse) {
  if (req.method !== 'POST') {
    throw BusinessErrors.validationFailed('method', req.method)
  }

  const requestId = (req as any).requestId
  const userLog = (level: LogLevel, message: string, data?: any) => {
    log(level, message, data, requestId)
  }

  // Rate limiting
  const rateLimitKey = getRateLimitKey(req)
  const rateLimitResult = checkRateLimit(`chat:${rateLimitKey}`)
  
  if (!rateLimitResult.allowed) {
    userLog(LogLevel.WARN, 'Chat rate limit exceeded', { 
      userId: req.user.id, 
      resetTime: rateLimitResult.resetTime 
    })
    throw BusinessErrors.rateLimitExceeded(rateLimitResult.resetTime)
  }

  // Validate request body
  const { error, value } = schema.validate(req.body)
  if (error) {
    userLog(LogLevel.WARN, 'Chat request validation failed', { 
      userId: req.user.id,
      validationError: error.details[0]
    })
    throw BusinessErrors.validationFailed(error.details[0].path.join('.'), error.details[0].message)
  }

  const { message, model, context = [] } = value
  const userId = req.user.id

  userLog(LogLevel.INFO, 'Chat request started', {
    userId,
    model,
    messageLength: message.length,
    contextLength: context.length
  })

  // Skip quota check for anonymous users
  let quotaStatus: any = null
  let messageCost = 0
  
  if (!req.user.isAnonymous) {
    // Check user quota for authenticated users
    quotaStatus = await getUserQuotaStatus(userId)
    messageCost = calculateMessageCost(quotaStatus.hasExceeded)
    
    userLog(LogLevel.DEBUG, 'User quota checked', {
      userId,
      quotaStatus,
      messageCost
    })
    
    // If user has exceeded free quota and no payment is made, return payment required
    if (quotaStatus.hasExceeded && messageCost > 0) {
      userLog(LogLevel.WARN, 'User quota exceeded, payment required', {
        userId,
        quotaStatus,
        costPerMessage: messageCost
      })
      
      return sendSuccess(res, {
        quotaStatus,
        costPerMessage: messageCost,
        paymentUrl: `/api/pay/checkout?amount=${messageCost * 100}&type=message`,
        paymentRequired: true
      }, requestId, 'Payment required for additional messages')
    }
  } else {
    userLog(LogLevel.DEBUG, 'Anonymous user, skipping quota check', { userId })
  }

  // Skip database operations for anonymous users
  let conversation: any = null
  
  if (!req.user.isAnonymous) {
    // Get or create conversation for authenticated users
    conversation = await prisma.conversation.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' }
    })

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          userId,
          title: 'New Chat'
        }
      })
    }

    // Save user message to database
    try {
      const userMessage = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          userId,
          role: 'user',
          content: message,
          model,
        },
      })

      userLog(LogLevel.DEBUG, 'User message saved to database', {
        messageId: userMessage.id,
        userId
      })
    } catch (error: any) {
      userLog(LogLevel.ERROR, 'Failed to save user message', { userId, error: error.message })
      throw BusinessErrors.openaiError('Failed to save message to database')
    }
  } else {
    userLog(LogLevel.DEBUG, 'Anonymous user, skipping database save', { userId })
  }

  // Prepare messages for AI model
  const messages: ChatMessage[] = [
    ...context,
    { role: 'user', content: message },
  ]

  userLog(LogLevel.DEBUG, 'Calling AI model', {
    model,
    messageCount: messages.length
  })

  // Call AI model
  let aiResponse
  try {
    const modelProvider = createModelProvider()
    aiResponse = await modelProvider.chat(messages, model)
    
    userLog(LogLevel.INFO, 'AI model response received', {
      model: aiResponse.model,
      latencyMs: aiResponse.latencyMs,
      tokenUsage: aiResponse.tokenUsage,
      isFallback: aiResponse.model === 'fallback'
    })
  } catch (error: any) {
    userLog(LogLevel.ERROR, 'AI model call failed', { error: error.message })
    throw BusinessErrors.openaiError(error.message)
  }

  // Save AI response to database
  let aiMessage
  try {
    aiMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        userId,
        role: 'assistant',
        content: aiResponse.content,
        model: aiResponse.model,
        latencyMs: aiResponse.latencyMs,
      },
    })

    userLog(LogLevel.DEBUG, 'AI response saved to database', {
      messageId: aiMessage.id,
      userId
    })
  } catch (error: any) {
    userLog(LogLevel.ERROR, 'Failed to save AI response', { userId, error: error.message })
    // 不抛出错误，因为AI已经生成了响应
  }

  // Update user quota (only if not in fallback mode)
  if (aiResponse.model !== 'fallback') {
    try {
      await incrementUserQuota(userId)
      userLog(LogLevel.DEBUG, 'User quota incremented', { userId })
    } catch (error: any) {
      userLog(LogLevel.WARN, 'Failed to update user quota', { userId, error: error.message })
      // 不影响响应，配额更新失败不是关键错误
    }
  }

  // Get updated quota status
  const updatedQuotaStatus = await getUserQuotaStatus(userId)

  userLog(LogLevel.INFO, 'Chat request completed successfully', {
    userId,
    messageId: aiMessage?.id,
    model: aiResponse.model,
    latencyMs: aiResponse.latencyMs
  })

  // Return response
  return sendSuccess(res, {
    id: aiMessage?.id,
    content: aiResponse.content,
    model: aiResponse.model,
    latencyMs: aiResponse.latencyMs,
    tokenUsage: aiResponse.tokenUsage,
    quotaStatus: updatedQuotaStatus,
  }, requestId, 'Chat completed successfully')
}

// 聊天处理器包装器 - 支持匿名和认证两种模式
async function chatHandlerWrapper(req: NextApiRequest, res: NextApiResponse) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  
  if (token) {
    // 有token，使用认证模式
    return withAuth(req, res, chatHandler)
  } else {
    // 无token，使用匿名模式
    const anonymousReq = req as NextApiRequest & { user: any }
    anonymousReq.user = { 
      id: 'anonymous_' + Date.now(),
      isAnonymous: true 
    }
    return chatHandler(anonymousReq, res)
  }
}

export default withErrorHandling(
  withPerformanceMonitoring(chatHandlerWrapper)
)