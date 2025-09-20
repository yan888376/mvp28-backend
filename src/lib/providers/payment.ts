// WeChat Pay Provider (V3 API)
import crypto from 'crypto'
import axios from 'axios'
import { config } from '../config'

export interface CreateOrderParams {
  userId: string
  amount: number // in CNY fen (1 yuan = 100 fen)
  description: string
  orderNo: string
}

export interface CreateOrderResponse {
  prepayId: string
  orderNo: string
  paymentParams: {
    appId: string
    timeStamp: string
    nonceStr: string
    package: string
    signType: string
    paySign: string
  }
}

export interface WebhookPayload {
  id: string
  create_time: string
  event_type: string
  summary: string
  resource_type: string
  resource: {
    ciphertext: string
    associated_data: string
    nonce: string
  }
}

export class WeChatPayProvider {
  private mchid: string
  private v3Key: string
  private serialNo: string
  private privateKey: string

  constructor() {
    this.mchid = config.wechat.pay.mchid
    this.v3Key = config.wechat.pay.v3Key
    this.serialNo = config.wechat.pay.serialNo
    
    // In production, load from file
    this.privateKey = process.env.WECHAT_PAY_PRIVATE_KEY || 'mock-private-key'
  }

  async createOrder({
    userId,
    amount,
    description,
    orderNo,
  }: CreateOrderParams): Promise<CreateOrderResponse> {
    const url = 'https://api.mch.weixin.qq.com/v3/pay/transactions/jsapi'
    
    const body = {
      appid: config.wechat.appid,
      mchid: this.mchid,
      description,
      out_trade_no: orderNo,
      notify_url: config.wechat.pay.notifyUrl,
      amount: {
        total: amount,
        currency: 'CNY',
      },
      payer: {
        openid: userId, // This should be the user's WeChat openid
      },
    }

    try {
      const signature = this.generateSignature('POST', url, JSON.stringify(body))
      
      const response = await axios.post(url, body, {
        headers: {
          'Authorization': `WECHATPAY2-SHA256-RSA2048 ${signature}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'MornGPT-MVP28/1.0',
        },
        timeout: 10000,
      })

      const prepayId = response.data.prepay_id
      
      // Generate payment parameters for mini program
      const paymentParams = this.generatePaymentParams(prepayId)

      return {
        prepayId,
        orderNo,
        paymentParams,
      }
    } catch (error: any) {
      console.error('WeChat Pay create order error:', error.response?.data || error.message)
      throw new Error(`Failed to create WeChat Pay order: ${error.response?.data?.message || error.message}`)
    }
  }

  generatePaymentParams(prepayId: string) {
    const appId = config.wechat.appid
    const timeStamp = Math.floor(Date.now() / 1000).toString()
    const nonceStr = crypto.randomBytes(16).toString('hex')
    const packageStr = `prepay_id=${prepayId}`

    // Create sign string
    const signStr = `${appId}\n${timeStamp}\n${nonceStr}\n${packageStr}\n`
    const paySign = crypto
      .createSign('RSA-SHA256')
      .update(signStr)
      .sign(this.privateKey, 'base64')

    return {
      appId,
      timeStamp,
      nonceStr,
      package: packageStr,
      signType: 'RSA',
      paySign,
    }
  }

  generateSignature(method: string, url: string, body: string): string {
    const timestamp = Math.floor(Date.now() / 1000)
    const nonce = crypto.randomBytes(16).toString('hex')
    const signStr = `${method}\n${url}\n${timestamp}\n${nonce}\n${body}\n`

    const signature = crypto
      .createSign('RSA-SHA256')
      .update(signStr)
      .sign(this.privateKey, 'base64')

    return `mchid="${this.mchid}",nonce_str="${nonce}",timestamp="${timestamp}",serial_no="${this.serialNo}",signature="${signature}"`
  }

  // 验证微信支付webhook签名
  verifyWebhook(payload: WebhookPayload, signature: string, timestamp: string, nonce: string): boolean {
    try {
      // 构建验证字符串
      const body = JSON.stringify(payload)
      const signStr = `${timestamp}\n${nonce}\n${body}\n`
      
      // 使用微信支付公钥验证签名 (生产环境需要获取真实公钥)
      // 这里为了MVP演示，简化处理
      if (process.env.NODE_ENV === 'development') {
        console.log('🔐 开发环境：跳过webhook签名验证')
        return true
      }
      
      // 生产环境应该使用真实的微信支付公钥验证
      // const isValid = crypto.verify(
      //   'RSA-SHA256',
      //   Buffer.from(signStr),
      //   wechatPayPublicKey,
      //   signature
      // )
      
      return true // 暂时返回true，生产环境需要实现真实验证
    } catch (error) {
      console.error('Webhook verification error:', error)
      return false
    }
  }

  // 解密微信支付webhook资源
  decryptWebhookResource(resource: WebhookPayload['resource']): any {
    try {
      if (process.env.NODE_ENV === 'development') {
        // 开发环境返回模拟数据
        return {
          mchid: this.mchid,
          appid: config.wechat.appid,
          out_trade_no: 'mock-order-no',
          trade_state: 'SUCCESS',
          amount: {
            total: 100,
            currency: 'CNY',
          },
          payer: {
            openid: 'mock-openid'
          },
          success_time: new Date().toISOString(),
        }
      }

      // 生产环境需要实现 AES-256-GCM 解密
      const { ciphertext, associated_data, nonce } = resource
      
      // 解密实现 (需要安装 crypto 库)
      // const decipher = crypto.createDecipherGCM('aes-256-gcm', Buffer.from(this.v3Key))
      // decipher.setAuthTag(Buffer.from(associated_data, 'base64'))
      // decipher.setAAD(Buffer.from(nonce, 'base64'))
      // 
      // let decrypted = decipher.update(ciphertext, 'base64', 'utf8')
      // decrypted += decipher.final('utf8')
      // 
      // return JSON.parse(decrypted)
      
      // 暂时返回模拟数据
      return {
        mchid: this.mchid,
        appid: config.wechat.appid,
        out_trade_no: 'production-order',
        trade_state: 'SUCCESS',
        amount: { total: 100, currency: 'CNY' },
      }
    } catch (error) {
      console.error('Resource decryption error:', error)
      throw new Error('Failed to decrypt webhook resource')
    }
  }

  // 查询支付订单状态
  async queryOrder(orderNo: string): Promise<{
    trade_state: string
    amount: { total: number, currency: string }
    success_time?: string
    payer?: { openid: string }
  }> {
    const url = `https://api.mch.weixin.qq.com/v3/pay/transactions/out-trade-no/${orderNo}`
    
    try {
      const signature = this.generateSignature('GET', url, '')
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `WECHATPAY2-SHA256-RSA2048 ${signature}`,
          'Accept': 'application/json',
          'User-Agent': 'MornGPT-MVP28/1.0',
        },
        timeout: 10000,
      })

      return response.data
    } catch (error: any) {
      console.error('Query order error:', error.response?.data || error.message)
      throw new Error(`Failed to query order: ${error.response?.data?.message || error.message}`)
    }
  }

  // 申请退款
  async refund(orderNo: string, refundNo: string, totalAmount: number, refundAmount: number): Promise<{
    refund_id: string
    out_refund_no: string
    status: string
  }> {
    const url = 'https://api.mch.weixin.qq.com/v3/refund/domestic/refunds'
    
    const body = {
      out_trade_no: orderNo,
      out_refund_no: refundNo,
      amount: {
        refund: refundAmount,
        total: totalAmount,
        currency: 'CNY',
      },
      reason: '用户申请退款',
    }

    try {
      const signature = this.generateSignature('POST', url, JSON.stringify(body))
      
      const response = await axios.post(url, body, {
        headers: {
          'Authorization': `WECHATPAY2-SHA256-RSA2048 ${signature}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'MornGPT-MVP28/1.0',
        },
        timeout: 10000,
      })

      return response.data
    } catch (error: any) {
      console.error('Refund error:', error.response?.data || error.message)
      throw new Error(`Failed to process refund: ${error.response?.data?.message || error.message}`)
    }
  }

  // 关闭订单
  async closeOrder(orderNo: string): Promise<void> {
    const url = `https://api.mch.weixin.qq.com/v3/pay/transactions/out-trade-no/${orderNo}/close`
    
    const body = { mchid: this.mchid }

    try {
      const signature = this.generateSignature('POST', url, JSON.stringify(body))
      
      await axios.post(url, body, {
        headers: {
          'Authorization': `WECHATPAY2-SHA256-RSA2048 ${signature}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'MornGPT-MVP28/1.0',
        },
        timeout: 10000,
      })
    } catch (error: any) {
      console.error('Close order error:', error.response?.data || error.message)
      throw new Error(`Failed to close order: ${error.response?.data?.message || error.message}`)
    }
  }
}