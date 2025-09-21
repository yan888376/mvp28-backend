// 环境变量测试API
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 检查所有配置的环境变量
    const envStatus = {
      OPENAI_API_KEY: {
        configured: !!process.env.OPENAI_API_KEY,
        length: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0,
        prefix: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 10) + '...' : 'undefined'
      },
      GOOGLE_API_KEY: {
        configured: !!process.env.GOOGLE_API_KEY,
        length: process.env.GOOGLE_API_KEY ? process.env.GOOGLE_API_KEY.length : 0,
        prefix: process.env.GOOGLE_API_KEY ? process.env.GOOGLE_API_KEY.substring(0, 10) + '...' : 'undefined'
      },
      ANTHROPIC_API_KEY: {
        configured: !!process.env.ANTHROPIC_API_KEY,
        length: process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.length : 0,
        prefix: process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.substring(0, 10) + '...' : 'undefined'
      },
      GROQ_API_KEY: {
        configured: !!process.env.GROQ_API_KEY,
        length: process.env.GROQ_API_KEY ? process.env.GROQ_API_KEY.length : 0,
        prefix: process.env.GROQ_API_KEY ? process.env.GROQ_API_KEY.substring(0, 10) + '...' : 'undefined'
      }
    };

    console.log('🔍 Environment Variables Status:', envStatus);

    return res.status(200).json({
      status: 'Environment Variables Check',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      vercelEnv: process.env.VERCEL_ENV || 'unknown',
      envStatus
    });

  } catch (error) {
    console.error('❌ Environment Check Error:', error);
    return res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}