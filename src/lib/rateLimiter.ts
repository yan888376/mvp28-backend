// Rate limiting utilities
import NodeCache from 'node-cache'
import { config } from './config'

const cache = new NodeCache({ stdTTL: config.rateLimit.windowMs / 1000 })

export interface RateLimitResult {
  allowed: boolean
  remainingRequests: number
  resetTime: number
}

export function checkRateLimit(identifier: string): RateLimitResult {
  const key = `rate_limit:${identifier}`
  const currentRequests = cache.get<number>(key) || 0
  const limit = config.rateLimit.perMinute
  
  if (currentRequests >= limit) {
    return {
      allowed: false,
      remainingRequests: 0,
      resetTime: Date.now() + config.rateLimit.windowMs,
    }
  }

  // Increment counter
  cache.set(key, currentRequests + 1, config.rateLimit.windowMs / 1000)

  return {
    allowed: true,
    remainingRequests: limit - currentRequests - 1,
    resetTime: Date.now() + config.rateLimit.windowMs,
  }
}

export function getRateLimitKey(req: any): string {
  // Use user ID if authenticated, otherwise use IP
  return req.user?.id || req.ip || req.connection.remoteAddress || 'unknown'
}