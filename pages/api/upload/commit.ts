// File upload commit API
import { NextApiRequest, NextApiResponse } from 'next'
import Joi from 'joi'
import { withAuth } from '@/lib/auth'
import { createStorageProvider } from '@/lib/providers/storage'
import { prisma } from '@/lib/prisma'

const schema = Joi.object({
  fileId: Joi.string().required(),
  originalName: Joi.string().required(),
  mimeType: Joi.string().required(),
  size: Joi.number().integer().min(1).required(),
})

async function commitHandler(req: NextApiRequest & { user: any }, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Validate request body
    const { error, value } = schema.validate(req.body)
    if (error) {
      return res.status(400).json({ error: error.details[0].message })
    }

    const { fileId, originalName, mimeType, size } = value
    const userId = req.user.id

    // Commit upload and get final URL
    const storageProvider = createStorageProvider()
    const fileMetadata = await storageProvider.commitUpload(fileId, {
      originalName,
      mimeType,
      size,
    })

    // Determine file type
    let fileType = 'file'
    if (mimeType.startsWith('image/')) {
      fileType = 'image'
    } else if (mimeType.startsWith('audio/')) {
      fileType = 'audio'
    } else if (mimeType.startsWith('video/')) {
      fileType = 'video'
    }

    // Save file metadata to database
    const mediaRecord = await prisma.media.create({
      data: {
        id: fileId,
        userId,
        type: fileType,
        storageUrl: fileMetadata.url,
        sizeBytes: size,
        originalName,
        storagePath: `uploads/${fileId}`,
        mimeType,
        metadata: {
          uploadedAt: new Date().toISOString(),
        },
      },
    })

    res.status(200).json({
      success: true,
      data: {
        id: mediaRecord.id,
        type: mediaRecord.type,
        url: mediaRecord.storageUrl,
        size: mediaRecord.sizeBytes,
        meta: mediaRecord.metadata,
        createdAt: mediaRecord.createdAt,
      },
    })
  } catch (error: any) {
    console.error('Commit upload error:', error)
    res.status(500).json({ 
      error: 'Upload commit failed',
      message: error.message,
    })
  }
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return withAuth(req, res, commitHandler)
}