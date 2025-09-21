// Location report API
import { NextApiRequest, NextApiResponse } from 'next'
import Joi from 'joi'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, getRateLimitKey } from '@/lib/rateLimiter'

const schema = Joi.object({
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required(),
  accuracy: Joi.number().min(0).optional(),
  timestamp: Joi.date().optional(),
  extra: Joi.object().optional(), // Additional location data
})

async function locationHandler(req: NextApiRequest & { user: any }, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Rate limiting (more lenient for location updates)
    const rateLimitKey = getRateLimitKey(req)
    const rateLimitResult = checkRateLimit(`location:${rateLimitKey}`)
    
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

    const { latitude, longitude, accuracy, timestamp, extra } = value
    const userId = req.user.id

    // Save location to database
    const locationLog = await prisma.locationLog.create({
      data: {
        userId,
        latitude,
        longitude,
        accuracy,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        metadata: extra,
      },
    })

    res.status(200).json({
      success: true,
      data: {
        id: locationLog.id,
        latitude: locationLog.lat,
        longitude: locationLog.lng,
        accuracy: locationLog.accuracy,
        timestamp: locationLog.ts,
        createdAt: locationLog.createdAt,
      },
    })
  } catch (error: any) {
    console.error('Location report error:', error)
    res.status(500).json({ 
      error: 'Location report failed',
      message: error.message,
    })
  }
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return withAuth(req, res, locationHandler)
}