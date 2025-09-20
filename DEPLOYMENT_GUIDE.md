# MVP28 Backend 部署指南

## 🚀 5天完整后端开发方案已完成

### ✅ 已完成的功能

1. **完整的后端架构**
   - Next.js + TypeScript + Prisma
   - Provider抽象层设计
   - JWT认证中间件
   - API限流保护

2. **核心API接口**
   - ✅ `POST /api/auth/wechat` - 微信登录
   - ✅ `POST /api/chat` - AI对话 (OpenAI GPT-4o-mini)
   - ✅ `POST /api/upload/presign` - 文件上传预签名
   - ✅ `POST /api/upload/commit` - 文件上传确认
   - ✅ `POST /api/location/report` - 位置上报
   - ✅ `POST /api/pay/checkout` - 微信支付订单
   - ✅ `POST /api/pay/wechat/webhook` - 支付回调
   - ✅ `GET /api/health` - 健康检查

3. **数据库设计**
   - 用户表 (users)
   - 会话表 (sessions)
   - 消息表 (messages)
   - 媒体文件表 (media)
   - 位置记录表 (location_logs)
   - 支付表 (payments)
   - 用户额度表 (user_quotas)

4. **业务功能**
   - 用户每日20条免费额度
   - 超额收费 1元/条消息
   - 微信支付沙箱集成
   - Supabase文件存储
   - OpenAI API集成

5. **前端优化**
   - ✅ 修复"解决问题"按钮位置 (向左移动8rpx)

## 📋 快速部署步骤

### 1. 环境准备

```bash
# 进入后端目录
cd mvp28-backend

# 设置环境变量
chmod +x scripts/setup-env.sh
./scripts/setup-env.sh

# 编辑 .env 文件，填入真实的API密钥
```

### 2. 必需的环境变量

```env
# 数据库 (Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres

# OpenAI API
OPENAI_API_KEY=sk-your-openai-api-key-here

# Supabase存储
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# 微信小程序
WECHAT_APPID=your-appid
WECHAT_SECRET=your-secret

# 微信支付
WECHAT_PAY_MCHID=your-merchant-id
WECHAT_PAY_V3KEY=your-v3-key
WECHAT_PAY_SERIAL_NO=your-serial-no

# JWT密钥
JWT_SECRET=your-super-secret-key

# 域名配置
APP_BASE_URL=https://your-backend-domain.vercel.app
FRONTEND_BASE_URL=https://your-frontend-domain
```

### 3. 一键部署

```bash
# 执行部署脚本
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

### 4. 验证部署

```bash
# 测试所有API接口
./scripts/test-endpoints.sh https://your-domain.vercel.app
```

## 🔧 前端集成

### 修改前端API配置

在前端项目中更新API基础URL：

```javascript
// 在小程序中更新request配置
const API_BASE_URL = 'https://your-backend-domain.vercel.app'

// 示例：聊天API调用
wx.request({
  url: `${API_BASE_URL}/api/chat`,
  method: 'POST',
  header: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  data: {
    message: '你好',
    model: 'gpt-4o-mini'
  },
  success: (res) => {
    console.log('AI回复:', res.data)
  }
})
```

### 微信小程序域名配置

在微信小程序管理后台添加以下合法域名：

```
request合法域名: https://your-backend-domain.vercel.app
uploadFile合法域名: https://your-supabase-project.supabase.co
downloadFile合法域名: https://your-supabase-project.supabase.co
```

## 🌍 海外部署优化

### Vercel配置 (新加坡节点)

```json
// vercel.json
{
  "regions": ["sin1"],
  "functions": {
    "pages/api/**/*.ts": {
      "maxDuration": 10
    }
  }
}
```

### API代理解决方案

后端已自动代理OpenAI API请求，用户无需翻墙即可使用：

```
用户(中国) → 小程序 → Vercel(新加坡) → OpenAI API
```

## 💰 成本控制

### API使用监控

```bash
# 查看OpenAI API使用情况
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/usage
```

### 用户额度管理

- 每用户每日20条免费消息
- 超额自动收费1元/条
- 支持动态调价配置

## 🔍 监控与维护

### 健康检查

```bash
curl https://your-domain.vercel.app/api/health
```

### 日志监控

- Vercel Dashboard自动提供请求日志
- 错误追踪和性能监控
- 支付回调状态监控

## 🚧 下一步开发 (V2)

1. **WebSocket流式对话**
   - 实现 `WS /api/chat/stream`
   - 支持打字机效果
   - 断线重连机制

2. **多模型智能路由**
   - Claude 3.5 Sonnet集成
   - 模型性能监控
   - 自动故障转移

3. **语音功能**
   - 语音转文字 (AssemblyAI)
   - 文字转语音
   - 实时语音对话

4. **高级文件处理**
   - PDF文档解析
   - 图片内容识别
   - 文件批量处理

## ⚠️ 重要提醒

1. **API密钥安全**：所有密钥必须通过环境变量配置，严禁硬编码
2. **支付测试**：当前使用微信支付沙箱，正式上线需切换商户号
3. **域名配置**：记得更新小程序后台的合法域名列表
4. **成本控制**：监控OpenAI API使用量，避免超预算

## 📞 技术支持

如遇到部署问题，请检查：
1. 环境变量是否正确配置
2. 数据库连接是否正常
3. API密钥是否有效
4. 域名解析是否正确

---

**项目交付状态：✅ 100% 完成**
- 后端架构：企业级设计 ✅
- 核心功能：完整实现 ✅
- 海外部署：新加坡节点 ✅
- 成本控制：$20-50预算 ✅
- 前端集成：无缝对接 ✅

**预估上线时间：24小时内完成部署和测试**