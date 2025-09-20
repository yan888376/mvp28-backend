# 🔧 环境配置指南

## 📋 配置文件说明

### `.env.example` - 配置模板
- ✅ 可以提交到GitHub
- ✅ 包含完整配置结构
- ✅ 使用占位符保护敏感信息
- ✅ 新开发者参考模板

### `.env` - 实际配置
- 🔒 绝对不提交到GitHub (.gitignore)
- 🔒 包含真实API密钥
- 🔒 仅在本地开发使用

## 🚀 部署环境配置

### 本地开发环境
```bash
# 1. 复制配置模板
cp .env.example .env

# 2. 编辑 .env 填入真实配置
# DATABASE_URL=postgresql://postgres:Haixiu0715@...
# OPENAI_API_KEY=sk-proj-8ymy5FH9f...
# WECHAT_APP_SECRET=99cfb6a193076537...
```

### Vercel生产环境
在Vercel Dashboard → Project Settings → Environment Variables 配置：

#### 必需配置
```bash
NODE_ENV=production
DATABASE_URL=postgresql://postgres:Haixiu0715@db.wmkduonbmovhabdsxzzt.supabase.co:5432/postgres
JWT_SECRET=your-super-secret-jwt-key-32-chars-minimum-length
OPENAI_API_KEY=sk-proj-8ymy5FH9fGpHHiAyL18cLs1vKNQ_KGI...
WECHAT_APP_ID=wxfd931315db72075d
WECHAT_APP_SECRET=99cfb6a193076537aa7da32ca274a10a
```

#### 微信支付配置
```bash
WECHAT_PAY_MCHID=1720865522
WECHAT_PAY_SERIAL_NO=3B66A8AF78879668659F52590B7A5631BADED800
WECHAT_PAY_API_V3_KEY=Ji8mxN8HEzcKXNWUL7SFoXRna7t80zRs
WECHAT_PAY_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC2a138...
-----END PRIVATE KEY-----"
```

#### Supabase配置
```bash
SUPABASE_URL=https://wmkduonbmovhabdsxzzt.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 🔐 安全最佳实践

### GitHub仓库
- ✅ 只提交 `.env.example`
- ✅ `.env` 在 `.gitignore` 中
- ✅ 敏感信息永不暴露

### Vercel部署
- ✅ 环境变量加密存储
- ✅ 只有项目成员可访问
- ✅ 生产环境自动注入

### 团队协作
- ✅ 新成员通过 `.env.example` 了解配置
- ✅ 敏感配置通过安全渠道分享
- ✅ 配置变更文档化

## 📊 配置验证

### 本地验证
```bash
npm run dev
curl http://localhost:3001/api/health
# 检查所有服务状态
```

### 生产验证
```bash
curl https://your-domain.vercel.app/api/health
# 确认生产环境配置正确
```

## ⚠️ 重要提醒

1. **永远不要**将 `.env` 文件提交到Git
2. **定期更换**API密钥和敏感凭据
3. **监控访问**日志和异常活动
4. **备份配置**到安全的地方

---

**这样既保证了安全性，又确保了部署的顺畅性！**