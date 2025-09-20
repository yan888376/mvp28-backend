// Environment configuration with validation
export const config = {
  // App settings
  app: {
    env: process.env.APP_ENV || 'development',
    baseUrl: process.env.APP_BASE_URL || 'http://localhost:3001',
    frontendUrl: process.env.FRONTEND_BASE_URL || 'http://localhost:3000',
  },

  // Database
  database: {
    url: process.env.DATABASE_URL || '',
  },

  // AI Model Provider
  ai: {
    provider: process.env.MODEL_PROVIDER || 'openai',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    maxTokens: 2000,
    temperature: 0.7,
    timeoutMs: 8000, // 8 second timeout
  },

  // Storage Provider
  storage: {
    provider: process.env.STORAGE_PROVIDER || 'supabase',
    supabase: {
      url: process.env.SUPABASE_URL || '',
      anonKey: process.env.SUPABASE_ANON_KEY || '',
      serviceKey: process.env.SUPABASE_SERVICE_KEY || '',
    },
  },

  // WeChat
  wechat: {
    appid: process.env.WECHAT_APPID || '',
    secret: process.env.WECHAT_SECRET || '',
    pay: {
      mchid: process.env.WECHAT_PAY_MCHID || '',
      v3Key: process.env.WECHAT_PAY_V3KEY || '',
      serialNo: process.env.WECHAT_PAY_SERIAL_NO || '',
      certPath: process.env.WECHAT_PAY_CERT_PATH || '',
      keyPath: process.env.WECHAT_PAY_KEY_PATH || '',
      notifyUrl: process.env.WECHAT_PAY_NOTIFY_URL || '',
    },
  },

  // Security
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-key',
    expiresIn: '7d',
    refreshExpiresIn: '30d',
  },

  // Rate limiting
  rateLimit: {
    perMinute: parseInt(process.env.RATE_LIMIT_PER_MINUTE || '60'),
    windowMs: 60 * 1000, // 1 minute
  },

  // Business logic
  business: {
    freeQuotaPerDay: parseInt(process.env.FREE_QUOTA_PER_DAY || '20'),
    paidPricePerMsgCny: parseInt(process.env.PAID_PRICE_PER_MSG_CNY || '1'),
  },
}

// Validation helper
export function validateConfig() {
  const required = [
    'DATABASE_URL',
    'OPENAI_API_KEY', 
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'WECHAT_APPID',
    'WECHAT_SECRET',
    'JWT_SECRET'
  ]

  const missing = required.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}