// WeChat Mini Program utilities
import axios from 'axios'
import { config } from './config'

export interface WeChatLoginResult {
  openid: string
  sessionKey: string
  unionid?: string
}

export async function wechatLogin(code: string): Promise<WeChatLoginResult> {
  const url = 'https://api.weixin.qq.com/sns/jscode2session'
  
  try {
    const response = await axios.get(url, {
      params: {
        appid: config.wechat.appid,
        secret: config.wechat.secret,
        js_code: code,
        grant_type: 'authorization_code',
      },
      timeout: 5000,
    })

    const data = response.data

    if (data.errcode) {
      throw new Error(`WeChat API error: ${data.errcode} - ${data.errmsg}`)
    }

    if (!data.openid) {
      throw new Error('Invalid WeChat login response')
    }

    return {
      openid: data.openid,
      sessionKey: data.session_key,
      unionid: data.unionid,
    }
  } catch (error: any) {
    console.error('WeChat login error:', error.response?.data || error.message)
    throw new Error(`WeChat login failed: ${error.message}`)
  }
}