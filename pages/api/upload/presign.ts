// File upload presign API
import { NextApiRequest, NextApiResponse } from 'next'
import Joi from 'joi'
import { withAuth } from '@/lib/auth'
import { createStorageProvider } from '@/lib/providers/storage'
import { checkRateLimit, getRateLimitKey } from '@/lib/rateLimiter'

const schema = Joi.object({
  fileName: Joi.string().required(),
  mimeType: Joi.string().required(),
  fileSize: Joi.number().integer().min(1).max(10 * 1024 * 1024).required(), // Max 10MB
})

const allowedMimeTypes = [
  'image/jpeg',
  'image/png', 
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

async function presignHandler(req: NextApiRequest & { user: any }, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Rate limiting
    const rateLimitKey = getRateLimitKey(req)
    const rateLimitResult = checkRateLimit(`upload:${rateLimitKey}`)
    
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

    const { fileName, mimeType, fileSize } = value
    const userId = req.user.id

    // Check allowed MIME types
    if (!allowedMimeTypes.includes(mimeType)) {
      return res.status(400).json({ 
        error: 'File type not allowed',
        allowedTypes: allowedMimeTypes,
      })
    }

    // Create presigned upload URL
    const storageProvider = createStorageProvider()
    const presignedUpload = await storageProvider.presignUpload(
      fileName,
      mimeType,
      userId
    )

    res.status(200).json({
      success: true,
      data: presignedUpload,
    })
  } catch (error: any) {
    console.error('Presign upload error:', error)
    res.status(500).json({ 
      error: 'Upload preparation failed',
      message: error.message,
    })
  }
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return withAuth(req, res, presignHandler)
}