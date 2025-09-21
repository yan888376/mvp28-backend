// JWT Authentication utilities
import jwt from 'jsonwebtoken'
import { config } from './config'
import { prisma } from './prisma'
import { NextApiRequest, NextApiResponse } from 'next'

export interface JWTPayload {
  userId: string
  wechatOpenid: string
  iat?: number
  exp?: number
}

export function signJWT(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, config.jwt.secret as string, { 
    expiresIn: config.jwt.expiresIn 
  })
}

export function verifyJWT(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, config.jwt.secret as string) as JWTPayload
  } catch {
    return null
  }
}

export async function getUserFromToken(token: string) {
  const payload = verifyJWT(token)
  if (!payload) return null

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      wechatOpenid: true,
      nickname: true,
      avatarUrl: true,
      createdAt: true,
    }
  })

  return user
}

// Middleware to protect API routes
export async function withAuth(
  req: NextApiRequest,
  res: NextApiResponse,
  handler: (req: NextApiRequest & { user: any }, res: NextApiResponse) => Promise<void>
) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' })
    }

    const token = authHeader.substring(7)
    const user = await getUserFromToken(token)
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    // Add user to request object
    ;(req as any).user = user
    
    await handler(req as any, res)
  } catch (error) {
    console.error('Auth middleware error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}