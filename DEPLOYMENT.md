# MornGPT 后端部署指南

## 🚀 一键部署到 Vercel

### 1. 环境准备

确保你已经安装以下工具：
- Node.js 18.0+
- npm 或 yarn
- Git
- Vercel CLI

```bash
# 安装 Vercel CLI
npm install -g vercel

# 登录 Vercel
vercel login
```

### 2. 数据库设置 (Supabase)

1. **创建 Supabase 项目**
   - 访问 [https://supabase.com](https://supabase.com)
   - 创建新项目
   - 记录项目 URL 和 API 密钥

2. **配置存储桶**
   ```sql
   -- 在 Supabase SQL 编辑器中执行
   insert into storage.buckets (id, name, public) values ('mornhub-media', 'mornhub-media', true);
   ```

3. **获取数据库连接 URL**
   - 在 Supabase 控制台 → Settings → Database
   - 复制 Connection string (Transaction mode)

### 3. 环境变量配置

在 Vercel 控制台或使用 CLI 配置以下环境变量：

```bash
# 核心配置
vercel env add NODE_ENV production
vercel env add APP_BASE_URL https://your-app.vercel.app
vercel env add DATABASE_URL "your-supabase-connection-string"

# JWT 配置
vercel env add JWT_SECRET "your-32-character-secret-key"
vercel env add JWT_EXPIRES_IN "24h"
vercel env add REFRESH_TOKEN_EXPIRES_IN "7d"

# 微信配置
vercel env add WECHAT_APP_ID "your-wechat-appid"
vercel env add WECHAT_APP_SECRET "your-wechat-app-secret"

# 微信支付配置 (沙箱)
vercel env add WECHAT_PAY_MCHID "your-merchant-id"
vercel env add WECHAT_PAY_PRIVATE_KEY "your-private-key"
vercel env add WECHAT_PAY_SERIAL_NO "your-serial-number"
vercel env add WECHAT_PAY_API_V3_KEY "your-api-v3-key"

# OpenAI 配置
vercel env add OPENAI_API_KEY "your-openai-api-key"
vercel env add OPENAI_MODEL "gpt-4o-mini"

# Supabase 配置
vercel env add SUPABASE_URL "your-supabase-url"
vercel env add SUPABASE_ANON_KEY "your-supabase-anon-key"
vercel env add SUPABASE_SERVICE_KEY "your-supabase-service-key"
vercel env add SUPABASE_STORAGE_BUCKET "mornhub-media"

# 业务配置
vercel env add FREE_QUOTA_PER_DAY "20"
vercel env add PAID_PRICE_PER_MESSAGE_CNY "100"
vercel env add MAX_UPLOAD_SIZE_MB "20"
```

### 4. 部署到 Vercel

```bash
# 确保在 mvp28-backend 目录下
cd mvp28-backend

# 首次部署
vercel --prod

# 后续部署
git add .
git commit -m "Update backend"
git push origin main
# Vercel 会自动部署
```

### 5. 数据库迁移

部署后运行数据库迁移：

```bash
# 方法一：使用 Vercel CLI
vercel env pull .env.production
npx prisma db push --accept-data-loss

# 方法二：在 Vercel 函数中执行
# 访问 https://your-app.vercel.app/api/migrate
```

### 6. 健康检查

部署完成后，验证服务是否正常：

```bash
# 健康检查
curl https://your-app.vercel.app/api/health

# 预期响应
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00Z",
    "version": "1.0.0",
    "services": {
      "database": "connected",
      "storage": "connected",
      "openai": "connected",
      "wechat": "connected"
    }
  }
}
```

## 🔧 自定义域名配置

### 1. 添加域名到 Vercel

```bash
# 添加域名
vercel domains add api.mornhub.net

# 验证域名
vercel domains verify api.mornhub.net
```

### 2. 配置 DNS

在你的 DNS 提供商处添加 CNAME 记录：

```
类型: CNAME
名称: api.mornhub.net
目标: cname.vercel-dns.com
```

### 3. 更新微信小程序配置

在微信小程序后台添加服务器域名：
- request合法域名: `https://api.mornhub.net`
- uploadFile合法域名: `https://api.mornhub.net`
- downloadFile合法域名: `https://api.mornhub.net`

## 📊 监控和日志

### 1. Vercel 控制台

- 访问 [https://vercel.com/dashboard](https://vercel.com/dashboard)
- 查看函数执行情况
- 监控错误和性能

### 2. 数据库监控

- 在 Supabase 控制台查看数据库性能
- 设置告警规则

### 3. 自定义监控 (可选)

```bash
# 添加 Sentry 监控
vercel env add SENTRY_DSN "your-sentry-dsn"

# 健康检查脚本
*/5 * * * * curl -f https://api.mornhub.net/api/health || echo "Health check failed"
```

## 🛠️ 故障排除

### 常见问题

1. **数据库连接失败**
   ```bash
   # 检查数据库 URL 格式
   # 正确格式: postgresql://user:pass@host:5432/db?schema=public
   ```

2. **环境变量未生效**
   ```bash
   # 重新部署以应用新的环境变量
   vercel --prod --force
   ```

3. **CORS 错误**
   - 检查 `vercel.json` 中的 CORS 配置
   - 确保小程序域名在白名单中

4. **微信支付回调失败**
   - 检查 webhook URL 是否可访问
   - 验证证书配置是否正确

### 调试命令

```bash
# 查看实时日志
vercel logs your-app-name --follow

# 检查环境变量
vercel env ls

# 本地调试
vercel dev

# 检查构建状态
vercel inspect deployment-url
```

## 🔒 安全检查清单

- [ ] 所有敏感信息都在环境变量中
- [ ] 启用了 HTTPS (Vercel 自动提供)
- [ ] 配置了正确的 CORS 策略
- [ ] 微信支付使用了签名验证
- [ ] JWT 密钥足够复杂 (32+ 字符)
- [ ] 数据库连接使用了 SSL
- [ ] 文件上传有大小和类型限制
- [ ] API 有适当的限流设置

## 📝 部署检查清单

### 部署前
- [ ] 代码通过所有测试
- [ ] 环境变量已配置
- [ ] 数据库已创建
- [ ] 存储桶已配置

### 部署后
- [ ] 健康检查通过
- [ ] 数据库连接正常
- [ ] OpenAI API 可访问
- [ ] 微信 API 可访问
- [ ] 文件上传功能正常
- [ ] 小程序可以正常调用后端

## 🚧 维护和更新

### 定期维护

1. **更新依赖包**
   ```bash
   npm update
   npm audit fix
   ```

2. **数据库备份**
   - Supabase 提供自动备份
   - 可设置定期导出

3. **监控性能**
   - 查看 Vercel Analytics
   - 监控数据库查询性能

4. **更新环境变量**
   ```bash
   # 轮换 JWT 密钥
   vercel env rm JWT_SECRET
   vercel env add JWT_SECRET "new-secret"
   ```

### 版本发布

```bash
# 打标签
git tag v1.0.0
git push origin v1.0.0

# 生产环境部署
vercel --prod
```

---

**文档版本**: 1.0.0  
**最后更新**: 2024-01-01  
**维护团队**: DevOps 团队