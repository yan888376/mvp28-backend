// 统一错误处理和日志记录工具
import { NextApiRequest, NextApiResponse } from 'next'

export interface ApiError {
  code: string
  message: string
  details?: any
  statusCode: number
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  code?: string
  timestamp: string
  requestId: string
}

// 生成请求ID
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// 日志级别
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

// 统一日志记录
export function log(level: LogLevel, message: string, data?: any, requestId?: string) {
  const timestamp = new Date().toISOString()
  const logEntry = {
    timestamp,
    level,
    message,
    requestId,
    data: data ? JSON.stringify(data, null, 2) : undefined
  }

  // 根据环境决定日志格式
  if (process.env.NODE_ENV === 'development') {
    // 开发环境：美化输出
    console.log(`[${timestamp}] [${level.toUpperCase()}] ${requestId ? `[${requestId}] ` : ''}${message}`)
    if (data) {
      console.log('  数据:', data)
    }
  } else {
    // 生产环境：JSON格式
    console.log(JSON.stringify(logEntry))
  }
}

// 预定义错误类型
export class AppError extends Error {
  public code: string
  public statusCode: number
  public details?: any

  constructor(code: string, message: string, statusCode: number = 500, details?: any) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }
}

// 常见错误定义
export const ErrorCodes = {
  // 认证错误
  AUTH_INVALID_TOKEN: { code: 'AUTH_INVALID_TOKEN', message: 'Invalid or expired token', statusCode: 401 },
  AUTH_MISSING_TOKEN: { code: 'AUTH_MISSING_TOKEN', message: 'Authorization token required', statusCode: 401 },
  AUTH_INSUFFICIENT_PERMISSIONS: { code: 'AUTH_INSUFFICIENT_PERMISSIONS', message: 'Insufficient permissions', statusCode: 403 },

  // 验证错误
  VALIDATION_FAILED: { code: 'VALIDATION_FAILED', message: 'Request validation failed', statusCode: 400 },
  VALIDATION_MISSING_FIELD: { code: 'VALIDATION_MISSING_FIELD', message: 'Required field missing', statusCode: 400 },
  VALIDATION_INVALID_FORMAT: { code: 'VALIDATION_INVALID_FORMAT', message: 'Invalid field format', statusCode: 400 },

  // 业务错误
  QUOTA_EXCEEDED: { code: 'QUOTA_EXCEEDED', message: 'Daily quota exceeded', statusCode: 402 },
  QUOTA_INSUFFICIENT_BALANCE: { code: 'QUOTA_INSUFFICIENT_BALANCE', message: 'Insufficient balance', statusCode: 402 },
  
  // 外部服务错误
  OPENAI_API_ERROR: { code: 'OPENAI_API_ERROR', message: 'OpenAI API service error', statusCode: 503 },
  WECHAT_API_ERROR: { code: 'WECHAT_API_ERROR', message: 'WeChat API service error', statusCode: 503 },
  STORAGE_ERROR: { code: 'STORAGE_ERROR', message: 'File storage service error', statusCode: 503 },
  PAYMENT_ERROR: { code: 'PAYMENT_ERROR', message: 'Payment service error', statusCode: 503 },

  // 系统错误
  DATABASE_ERROR: { code: 'DATABASE_ERROR', message: 'Database operation failed', statusCode: 500 },
  INTERNAL_ERROR: { code: 'INTERNAL_ERROR', message: 'Internal server error', statusCode: 500 },
  RATE_LIMIT_EXCEEDED: { code: 'RATE_LIMIT_EXCEEDED', message: 'Rate limit exceeded', statusCode: 429 },

  // 资源错误
  RESOURCE_NOT_FOUND: { code: 'RESOURCE_NOT_FOUND', message: 'Resource not found', statusCode: 404 },
  RESOURCE_CONFLICT: { code: 'RESOURCE_CONFLICT', message: 'Resource conflict', statusCode: 409 },
  
  // 文件处理错误
  FILE_TOO_LARGE: { code: 'FILE_TOO_LARGE', message: 'File size exceeds limit', statusCode: 413 },
  FILE_TYPE_NOT_ALLOWED: { code: 'FILE_TYPE_NOT_ALLOWED', message: 'File type not allowed', statusCode: 415 },
  FILE_UPLOAD_FAILED: { code: 'FILE_UPLOAD_FAILED', message: 'File upload failed', statusCode: 500 },
}

// 错误处理中间件
export function withErrorHandling(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const requestId = generateRequestId()
    
    // 在请求对象上添加 requestId 和 log 方法
    ;(req as any).requestId = requestId
    ;(req as any).log = (level: LogLevel, message: string, data?: any) => {
      log(level, message, data, requestId)
    }

    // 记录请求开始
    log(LogLevel.INFO, `${req.method} ${req.url}`, {
      headers: req.headers,
      query: req.query,
      body: req.method !== 'GET' ? req.body : undefined
    }, requestId)

    try {
      await handler(req, res)
      
      // 记录成功响应
      log(LogLevel.INFO, `Request completed successfully`, {
        statusCode: res.statusCode
      }, requestId)
    } catch (error: any) {
      handleError(error, req, res, requestId)
    }
  }
}

// 统一错误处理函数
export function handleError(
  error: any,
  req: NextApiRequest,
  res: NextApiResponse,
  requestId: string
) {
  let apiError: ApiError

  if (error instanceof AppError) {
    // 自定义应用错误
    apiError = {
      code: error.code,
      message: error.message,
      details: error.details,
      statusCode: error.statusCode
    }
  } else if (error.name === 'ValidationError') {
    // Joi 验证错误
    apiError = {
      code: 'VALIDATION_FAILED',
      message: error.details?.[0]?.message || 'Validation failed',
      details: error.details,
      statusCode: 400
    }
  } else if (error.code === 'P2002') {
    // Prisma 唯一约束错误
    apiError = {
      code: 'RESOURCE_CONFLICT',
      message: 'Resource already exists',
      details: error.meta,
      statusCode: 409
    }
  } else if (error.code === 'P2025') {
    // Prisma 记录不存在错误
    apiError = {
      code: 'RESOURCE_NOT_FOUND',
      message: 'Resource not found',
      details: error.meta,
      statusCode: 404
    }
  } else {
    // 未知错误
    apiError = {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      statusCode: 500
    }
  }

  // 记录错误日志
  log(LogLevel.ERROR, `Request failed: ${apiError.message}`, {
    error: {
      code: apiError.code,
      message: apiError.message,
      details: apiError.details,
      stack: error.stack
    },
    request: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      query: req.query,
      body: req.method !== 'GET' ? req.body : undefined
    }
  }, requestId)

  // 构建统一响应格式
  const response: ApiResponse = {
    success: false,
    error: apiError.message,
    code: apiError.code,
    timestamp: new Date().toISOString(),
    requestId
  }

  // 开发环境提供更多错误信息
  if (process.env.NODE_ENV === 'development' && apiError.details) {
    response.message = JSON.stringify(apiError.details, null, 2)
  }

  res.status(apiError.statusCode).json(response)
}

// 成功响应工具函数
export function sendSuccess<T>(
  res: NextApiResponse,
  data: T,
  requestId: string,
  message?: string
) {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    requestId
  }

  res.status(200).json(response)
}

// 创建特定错误的便捷函数
export function createError(errorType: keyof typeof ErrorCodes, details?: any): AppError {
  const errorDef = ErrorCodes[errorType]
  return new AppError(errorDef.code, errorDef.message, errorDef.statusCode, details)
}

// 业务逻辑专用错误函数
export const BusinessErrors = {
  quotaExceeded: (remaining: number) => createError('QUOTA_EXCEEDED', { remaining }),
  invalidToken: () => createError('AUTH_INVALID_TOKEN'),
  missingToken: () => createError('AUTH_MISSING_TOKEN'),
  validationFailed: (field: string, value: any) => createError('VALIDATION_FAILED', { field, value }),
  resourceNotFound: (resource: string, id: string) => createError('RESOURCE_NOT_FOUND', { resource, id }),
  rateLimitExceeded: (resetTime: number) => createError('RATE_LIMIT_EXCEEDED', { resetTime }),
  openaiError: (message: string) => createError('OPENAI_API_ERROR', { originalMessage: message }),
  wechatError: (message: string) => createError('WECHAT_API_ERROR', { originalMessage: message }),
  paymentError: (message: string) => createError('PAYMENT_ERROR', { originalMessage: message }),
}

// 性能监控装饰器
export function withPerformanceMonitoring(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const startTime = Date.now()
    const requestId = (req as any).requestId || generateRequestId()

    try {
      await handler(req, res)
    } finally {
      const duration = Date.now() - startTime
      log(LogLevel.INFO, `Request performance`, {
        method: req.method,
        url: req.url,
        duration: `${duration}ms`,
        statusCode: res.statusCode
      }, requestId)

      // 慢查询告警 (超过5秒)
      if (duration > 5000) {
        log(LogLevel.WARN, `Slow request detected`, {
          method: req.method,
          url: req.url,
          duration: `${duration}ms`
        }, requestId)
      }
    }
  }
}