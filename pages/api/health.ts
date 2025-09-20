// Health check endpoint
import { NextApiRequest, NextApiResponse } from 'next'
import { config } from '@/lib/config'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: config.app.env,
      services: {
        database: 'connected', // In production, actually test DB connection
        ai: config.ai.provider,
        storage: config.storage.provider,
      },
    }

    res.status(200).json(health)
  } catch (error) {
    console.error('Health check failed:', error)
    res.status(500).json({ 
      status: 'unhealthy',
      error: 'Service unavailable'
    })
  }
}