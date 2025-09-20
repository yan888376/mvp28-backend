// WeChat login API
import { NextApiRequest, NextApiResponse } from 'next'
import Joi from 'joi'
import { prisma } from '@/lib/prisma'
import { wechatLogin } from '@/lib/wechat'
import { signJWT } from '@/lib/auth'
import { checkRateLimit, getRateLimitKey } from '@/lib/rateLimiter'

const schema = Joi.object({
  code: Joi.string().required(),
  userInfo: Joi.object({
    nickname: Joi.string().optional(),
    avatarUrl: Joi.string().uri().optional(),
  }).optional(),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Rate limiting
    const rateLimitKey = getRateLimitKey(req)
    const rateLimitResult = checkRateLimit(`auth:${rateLimitKey}`)
    
    if (!rateLimitResult.allowed) {
      return res.status(429).json({ 
        error: 'Too many requests', 
        resetTime: rateLimitResult.resetTime 
      })
    }

    // Validate request body
    const { error, value } = schema.validate(req.body)
    if (error) {
      return res.status(400).json({ error: error.details[0].message })
    }

    const { code, userInfo } = value

    // Get WeChat user info
    const wechatResult = await wechatLogin(code)

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { wechatOpenid: wechatResult.openid },
      select: {
        id: true,
        wechatOpenid: true,
        nickname: true,
        avatarUrl: true,
        createdAt: true,
      },
    })

    if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: {
          wechatOpenid: wechatResult.openid,
          nickname: userInfo?.nickname || null,
          avatarUrl: userInfo?.avatarUrl || null,
        },
        select: {
          id: true,
          wechatOpenid: true,
          nickname: true,
          avatarUrl: true,
          createdAt: true,
        },
      })
    } else if (userInfo && (userInfo.nickname || userInfo.avatarUrl)) {
      // Update existing user info if provided
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          nickname: userInfo.nickname || user.nickname,
          avatarUrl: userInfo.avatarUrl || user.avatarUrl,
        },
        select: {
          id: true,
          wechatOpenid: true,
          nickname: true,
          avatarUrl: true,
          createdAt: true,
        },
      })
    }

    // Generate JWT token
    const token = signJWT({
      userId: user.id,
      wechatOpenid: user.wechatOpenid,
    })

    // Create session record
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken: token, // In production, use separate refresh token
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    })

    res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          nickname: user.nickname,
          avatarUrl: user.avatarUrl,
          createdAt: user.createdAt,
        },
      },
    })
  } catch (error: any) {
    console.error('WeChat login error:', error)
    res.status(500).json({ 
      error: 'Login failed',
      message: error.message,
    })
  }
}