// Payment order query API
import { NextApiRequest, NextApiResponse } from 'next'
import Joi from 'joi'
import { withAuth } from '@/lib/auth'
import { WeChatPayProvider } from '@/lib/providers/payment'
import { prisma } from '@/lib/prisma'
import { 
  withErrorHandling, 
  BusinessErrors,
  sendSuccess,
  LogLevel
} from '@/lib/errorHandler'

const schema = Joi.object({
  orderId: Joi.string().required(),
})

async function queryHandler(req: NextApiRequest & { user: any }, res: NextApiResponse) {
  if (req.method !== 'GET') {
    throw BusinessErrors.validationFailed('method', req.method)
  }

  const requestId = (req as any).requestId
  
  // Validate query parameters
  const { error, value } = schema.validate(req.query)
  if (error) {
    throw BusinessErrors.validationFailed(error.details[0].path.join('.'), error.details[0].message)
  }

  const { orderId } = value
  const userId = req.user.id

  try {
    // Find payment record
    const payment = await prisma.payment.findFirst({
      where: {
        id: orderId,
        userId, // 确保用户只能查询自己的订单
      },
    })

    if (!payment) {
      throw BusinessErrors.resourceNotFound('payment', orderId)
    }

    // Query WeChat Pay for latest status if payment is still pending
    let latestStatus = payment.status
    let wechatPayData = null

    if (payment.status === 'pending' && payment.prepayId) {
      try {
        const wechatPay = new WeChatPayProvider()
        const orderNo = `MVT28_${payment.createdAt.getTime()}_${userId.substring(0, 8)}`
        
        wechatPayData = await wechatPay.queryOrder(orderNo)
        
        // Update local payment status based on WeChat Pay response
        if (wechatPayData.trade_state === 'SUCCESS') {
          await prisma.payment.update({
            where: { id: payment.id },
            data: { 
              status: 'paid',
              updatedAt: new Date()
            },
          })
          latestStatus = 'paid'
        } else if (wechatPayData.trade_state === 'CLOSED' || wechatPayData.trade_state === 'PAYERROR') {
          await prisma.payment.update({
            where: { id: payment.id },
            data: { 
              status: 'failed',
              updatedAt: new Date()
            },
          })
          latestStatus = 'failed'
        }
      } catch (error) {
        console.error('WeChat Pay query error:', error)
        // 查询失败不影响返回本地状态
      }
    }

    return sendSuccess(res, {
      id: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      status: latestStatus,
      provider: payment.provider,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      wechatPayData: wechatPayData ? {
        trade_state: wechatPayData.trade_state,
        success_time: wechatPayData.success_time,
      } : null,
    }, requestId, 'Payment query completed')
  } catch (error: any) {
    if (error.name === 'AppError') {
      throw error
    }
    throw BusinessErrors.paymentError(error.message)
  }
}

export default withErrorHandling(
  (req: NextApiRequest, res: NextApiResponse) => {
    return withAuth(req, res, queryHandler)
  }
)