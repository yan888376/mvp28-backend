import axios from 'axios';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  // 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: '只支持 POST 请求'
      }
    });
  }

  try {
    const { code, user_info } = req.body;

    // 验证必需参数
    if (!code) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_CODE',
          message: '缺少微信登录 code 参数'
        }
      });
    }

    // 调用微信 code2session API
    const wechatApiUrl = 'https://api.weixin.qq.com/sns/jscode2session';
    const wechatResponse = await axios.get(wechatApiUrl, {
      params: {
        appid: process.env.WECHAT_APP_ID,
        secret: process.env.WECHAT_APP_SECRET,
        js_code: code,
        grant_type: 'authorization_code'
      },
      timeout: 10000 // 10 秒超时
    });

    const wechatData = wechatResponse.data;

    // 检查微信 API 响应
    if (wechatData.errcode) {
      console.error('WeChat API error:', wechatData);
      return res.status(400).json({
        success: false,
        error: {
          code: 'WECHAT_API_ERROR',
          message: '微信登录失败',
          details: `微信错误码: ${wechatData.errcode}`
        }
      });
    }

    const { openid, unionid, session_key } = wechatData;

    if (!openid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_OPENID',
          message: '获取微信用户信息失败'
        }
      });
    }

    // 查找或创建用户（暂时注释数据库操作，等 Service Key）
    let user;
    try {
      // 查找现有用户
      // user = await prisma.user.findUnique({
      //   where: { wechatOpenid: openid }
      // });

      // if (!user) {
      //   // 创建新用户
      //   user = await prisma.user.create({
      //     data: {
      //       wechatOpenid: openid,
      //       wechatUnionid: unionid || null,
      //       nickname: user_info?.nickname || null,
      //       avatarUrl: user_info?.avatar_url || null
      //     }
      //   });
      // } else if (user_info) {
      //   // 更新现有用户信息
      //   user = await prisma.user.update({
      //     where: { id: user.id },
      //     data: {
      //       nickname: user_info.nickname || user.nickname,
      //       avatarUrl: user_info.avatar_url || user.avatarUrl,
      //       wechatUnionid: unionid || user.wechatUnionid
      //     }
      //   });
      // }

      // 模拟用户数据（临时）
      user = {
        id: `user_${openid.slice(-8)}`,
        wechatOpenid: openid,
        wechatUnionid: unionid || null,
        nickname: user_info?.nickname || '微信用户',
        avatarUrl: user_info?.avatar_url || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

    } catch (dbError) {
      console.error('Database error:', dbError);
      // 如果数据库不可用，使用临时用户数据
      user = {
        id: `temp_${openid.slice(-8)}`,
        wechatOpenid: openid,
        wechatUnionid: unionid || null,
        nickname: user_info?.nickname || '微信用户',
        avatarUrl: user_info?.avatar_url || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    // 生成 JWT Token
    const accessTokenPayload = {
      sub: user.id,
      openid: openid,
      type: 'access',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 小时
    };

    const refreshTokenPayload = {
      sub: user.id,
      openid: openid,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 天
    };

    const accessToken = jwt.sign(accessTokenPayload, process.env.JWT_SECRET || 'default-secret');
    const refreshToken = jwt.sign(refreshTokenPayload, process.env.JWT_SECRET || 'default-secret');

    // 保存 refresh token 到数据库（暂时跳过）
    try {
      // await prisma.session.create({
      //   data: {
      //     userId: user.id,
      //     refreshToken: refreshToken,
      //     expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 天后过期
      //   }
      // });
    } catch (sessionError) {
      console.warn('Failed to save session:', sessionError);
    }

    // 返回成功响应
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          nickname: user.nickname,
          avatar_url: user.avatarUrl,
          wechat_openid: user.wechatOpenid
        },
        tokens: {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: 86400 // 24 小时
        }
      }
    });

  } catch (error) {
    console.error('WeChat auth error:', error);

    // 区分不同类型的错误
    if (error.code === 'ECONNABORTED') {
      return res.status(408).json({
        success: false,
        error: {
          code: 'REQUEST_TIMEOUT',
          message: '微信服务请求超时，请重试'
        }
      });
    }

    if (error.response?.status) {
      return res.status(502).json({
        success: false,
        error: {
          code: 'EXTERNAL_SERVICE_ERROR',
          message: '微信服务暂时不可用'
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '服务器内部错误',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });

  } finally {
    await prisma.$disconnect();
  }
}