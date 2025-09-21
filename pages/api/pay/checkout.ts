// Payment checkout API
import { NextApiRequest, NextApiResponse } from 'next'
import Joi from 'joi'
import { withAuth } from '@/lib/auth'
import { WeChatPayProvider } from '@/lib/providers/payment'
import { prisma } from '@/lib/prisma'
import { v4 as uuidv4 } from 'uuid'
import { config } from '@/lib/config'

const schema = Joi.object({
  amount: Joi.number().integer().min(100).max(100000).required(), // 1 yuan to 1000 yuan in fen
  type: Joi.string().valid('message', 'subscription').default('message'),
  description: Joi.string().max(100).optional(),
})

async function checkoutHandler(req: NextApiRequest & { user: any }, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Validate request body
    const { error, value } = schema.validate(req.body)
    if (error) {
      return res.status(400).json({ error: error.details[0].message })
    }

    const { amount, type, description } = value
    const userId = req.user.id
    const orderNo = `MVT28_${Date.now()}_${userId.substring(0, 8)}`

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        userId,
        orderNo,
        provider: 'wechat',
        amount,
        currency: 'CNY',
        status: 'pending',
        prepayId: '', // Will be updated with prepay_id
      },
    })

    // Create WeChat Pay order
    const wechatPay = new WeChatPayProvider()
    
    try {
      const orderResult = await wechatPay.createOrder({
        userId: req.user.wechatOpenid,
        amount,
        description: description || `MornGPT ${type === 'message' ? '消息购买' : '订阅服务'}`,
        orderNo,
      })

      // Update payment with prepay_id
      await prisma.payment.update({
        where: { id: payment.id },
        data: { prepayId: orderResult.prepayId },
      })

      res.status(200).json({
        success: true,
        data: {
          paymentId: payment.id,
          orderNo,
          amount,
          currency: 'CNY',
          paymentParams: orderResult.paymentParams,
        },
      })
    } catch (payError: any) {
      // Update payment status to failed
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'failed' },
      })

      console.error('WeChat Pay order creation failed:', payError)
      res.status(500).json({
        error: 'Payment initialization failed',
        message: 'Unable to create payment order',
      })
    }
  } catch (error: any) {
    console.error('Checkout error:', error)
    res.status(500).json({ 
      error: 'Checkout failed',
      message: error.message,
    })
  }
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return withAuth(req, res, checkoutHandler)
}