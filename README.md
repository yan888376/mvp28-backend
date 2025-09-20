# MVP28 Backend - MornGPT API

企业级后端API服务，支持AI对话、微信支付、文件上传等功能。

## 🚀 快速开始

### 环境要求
- Node.js >= 18.0.0
- PostgreSQL 数据库
- 微信小程序开发者账号
- OpenAI API Key
- Supabase 账号

### 安装依赖
```bash
npm install
```

### 环境配置
1. 复制环境变量模板：
```bash
cp .env.example .env
```

2. 填写必要的环境变量：
```env
# 数据库连接
DATABASE_URL=postgresql://username:password@host:port/database

# OpenAI API Key
OPENAI_API_KEY=sk-your-key-here

# Supabase 配置
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# 微信小程序配置
WECHAT_APPID=your-appid
WECHAT_SECRET=your-secret

# JWT 密钥
JWT_SECRET=your-secret-key

# 其他配置...
```

### 数据库初始化
```bash
# 生成 Prisma 客户端
npm run db:generate

# 推送数据库结构
npm run db:push

# (可选) 打开数据库管理界面
npm run db:studio
```

### 本地开发
```bash
npm run dev
```

服务将在 http://localhost:3001 启动

## 📁 项目结构

```
mvp28-backend/
├── pages/api/           # API 路由
│   ├── auth/
│   │   └── wechat.ts   # 微信登录
│   ├── chat.ts         # AI 对话
│   ├── upload/         # 文件上传
│   ├── location/       # 位置上报
│   ├── pay/            # 支付系统
│   └── health.ts       # 健康检查
├── src/
│   └── lib/            # 核心库
│       ├── providers/  # 服务提供商抽象层
│       ├── auth.ts     # 认证中间件
│       ├── config.ts   # 环境配置
│       ├── prisma.ts   # 数据库客户端
│       └── ...
├── prisma/
│   └── schema.prisma   # 数据库模型
└── ...
```

## 🔌 API 接口

### 认证
- `POST /api/auth/wechat` - 微信登录

### AI 对话
- `POST /api/chat` - 发送消息获取AI回复

### 文件上传
- `POST /api/upload/presign` - 获取上传预签名URL
- `POST /api/upload/commit` - 确认文件上传完成

### 位置服务
- `POST /api/location/report` - 上报用户位置

### 支付系统
- `POST /api/pay/checkout` - 创建支付订单
- `POST /api/pay/wechat/webhook` - 微信支付回调

### 系统
- `GET /api/health` - 服务健康检查

## 🏗️ 架构特点

### Provider 模式
- **ModelProvider**: AI模型抽象层 (OpenAI, Claude, etc.)
- **StorageProvider**: 存储服务抽象层 (Supabase, S3, etc.) 
- **PaymentProvider**: 支付服务抽象层 (微信支付, 支付宝, etc.)

### 安全特性
- JWT 令牌认证
- API 限流保护
- 请求数据验证
- 环境变量管理
- Webhook 签名验证

### 商业逻辑
- 用户每日免费额度管理
- 超额付费自动计费
- 支付状态跟踪
- 幂等性保证

## 🚢 部署

### Vercel 部署 (推荐)
```bash
# 安装 Vercel CLI
npm install -g vercel

# 部署到生产环境
npm run deploy
```

### 环境变量配置
在 Vercel Dashboard 中配置所有必要的环境变量。

### 域名配置
1. 在 Vercel 中添加自定义域名 `www.mornhub.net`
2. 配置 DNS 解析
3. 更新微信小程序后台的合法域名列表

## 📊 监控与维护

### 健康检查
```bash
curl https://your-domain.com/api/health
```

### 数据库管理
```bash
# 查看数据库状态
npm run db:studio

# 创建新的数据库迁移
npm run db:migrate
```

### 日志监控
- Vercel 自动提供日志监控
- 可集成 Sentry 等错误追踪服务

## 🔒 安全注意事项

1. **环境变量**: 所有敏感信息必须通过环境变量配置
2. **API 密钥轮换**: 定期更换 OpenAI API Key 等密钥
3. **限流保护**: 已内置 API 限流，可根据需要调整
4. **Webhook 安全**: 微信支付 Webhook 已实现签名验证
5. **数据库安全**: 使用 Prisma ORM 防止 SQL 注入

## 🐛 故障排除

### 常见问题
1. **数据库连接失败**: 检查 `DATABASE_URL` 是否正确
2. **OpenAI API 超时**: 检查网络连接，可能需要代理
3. **微信支付回调失败**: 检查域名配置和证书设置
4. **文件上传失败**: 检查 Supabase 存储桶配置

### 开发调试
```bash
# 查看详细错误日志
npm run dev

# 数据库调试
npm run db:studio
```

## 📝 开发计划

### MVP (当前版本)
- ✅ 微信登录认证
- ✅ OpenAI GPT 对话
- ✅ 文件上传 (Supabase)
- ✅ 位置上报
- ✅ 微信支付 (沙箱)
- ✅ 用户额度管理

### V2 (后续版本)
- 🔄 WebSocket 流式对话
- 🔄 多模型智能路由
- 🔄 语音识别集成
- 🔄 高级文件处理
- 🔄 微信支付正式商户

## 📞 支持

如有问题，请查看：
1. API 文档: `/api/health`
2. 数据库模型: `prisma/schema.prisma` 
3. 配置说明: `src/lib/config.ts`

---

**MornGPT MVP28** - 企业级AI对话后端服务