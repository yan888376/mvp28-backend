import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  // 只允许 GET 请求
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: '只支持 GET 请求'
      }
    });
  }

  try {
    const startTime = Date.now();
    
    // 测试数据库连接
    let databaseStatus = 'disconnected';
    try {
      await prisma.$queryRaw`SELECT 1`;
      databaseStatus = 'connected';
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      databaseStatus = 'error';
    }

    // 测试 OpenAI 连接状态
    let openaiStatus = 'unknown';
    try {
      if (process.env.OPENAI_API_KEY) {
        openaiStatus = 'configured';
      } else {
        openaiStatus = 'not_configured';
      }
    } catch (error) {
      openaiStatus = 'error';
    }

    // 测试微信配置
    let wechatStatus = 'unknown';
    if (process.env.WECHAT_APP_ID && process.env.WECHAT_APP_SECRET) {
      wechatStatus = 'configured';
    } else {
      wechatStatus = 'not_configured';
    }

    // 测试 Supabase 配置
    let supabaseStatus = 'unknown';
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      supabaseStatus = 'configured';
    } else {
      supabaseStatus = 'not_configured';
    }

    const responseTime = Date.now() - startTime;

    // 确定整体状态
    const overallStatus = databaseStatus === 'connected' ? 'healthy' : 'degraded';

    res.status(200).json({
      success: true,
      data: {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        services: {
          database: databaseStatus,
          openai: openaiStatus,
          wechat: wechatStatus,
          supabase: supabaseStatus
        },
        metrics: {
          response_time_ms: responseTime,
          memory_usage: process.memoryUsage(),
          uptime: process.uptime()
        },
        config: {
          app_base_url: process.env.APP_BASE_URL,
          frontend_base_url: process.env.FRONTEND_BASE_URL,
          cors_origins: process.env.CORS_ORIGINS
        }
      }
    });

  } catch (error) {
    console.error('Health check error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: '健康检查失败',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  } finally {
    await prisma.$disconnect();
  }
}