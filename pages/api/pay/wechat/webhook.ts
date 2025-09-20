// WeChat Pay webhook handler
import { NextApiRequest, NextApiResponse } from 'next'
import { WeChatPayProvider, WebhookPayload } from '@/lib/providers/payment'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const signature = req.headers['wechatpay-signature'] as string
    const timestamp = req.headers['wechatpay-timestamp'] as string
    const nonce = req.headers['wechatpay-nonce'] as string
    
    if (!signature || !timestamp || !nonce) {
      return res.status(400).json({ error: 'Missing webhook headers' })
    }

    // Verify webhook signature
    const wechatPay = new WeChatPayProvider()
    const payload: WebhookPayload = req.body
    
    const isValid = wechatPay.verifyWebhook(payload, signature, timestamp, nonce)
    if (!isValid) {
      console.error('Invalid webhook signature')
      return res.status(401).json({ error: 'Invalid signature' })
    }

    // Process payment notification
    if (payload.event_type === 'TRANSACTION.SUCCESS') {
      const decryptedResource = wechatPay.decryptWebhookResource(payload.resource)
      const { out_trade_no, trade_state, amount } = decryptedResource

      // Find payment record
      const existingPayment = await prisma.payment.findFirst({
        where: {
          intentId: decryptedResource.prepay_id || '',
          status: 'pending',
        },
      })

      if (!existingPayment) {
        console.error('Payment not found for webhook:', out_trade_no)
        return res.status(404).json({ error: 'Payment not found' })
      }

      // Check for duplicate processing (idempotency)
      if (existingPayment.status === 'paid') {
        return res.status(200).json({ code: 'SUCCESS', message: 'Already processed' })
      }

      // Update payment status
      if (trade_state === 'SUCCESS') {
        await prisma.payment.update({
          where: { id: existingPayment.id },
          data: {
            status: 'paid',
            updatedAt: new Date(),
          },
        })

        console.log('Payment completed:', {
          paymentId: existingPayment.id,
          userId: existingPayment.userId,
          amount: amount.total,
        })

        // Here you could trigger additional logic like:
        // - Add credits to user account
        // - Send confirmation email/notification
        // - Update subscription status
      } else {
        await prisma.payment.update({
          where: { id: existingPayment.id },
          data: {
            status: 'failed',
            updatedAt: new Date(),
          },
        })
      }
    }

    // Respond with success (required by WeChat Pay)
    res.status(200).json({ code: 'SUCCESS', message: 'OK' })
  } catch (error: any) {
    console.error('Webhook processing error:', error)
    res.status(500).json({ 
      code: 'FAIL', 
      message: 'Webhook processing failed' 
    })
  }
}

// Disable body parser for webhook raw body verification
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}