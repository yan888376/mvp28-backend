# MornGPT 后端产品需求文档 (PRD)

## 📋 核心目标 (Mission)
为 MornGPT 微信小程序提供稳定、安全、可扩展的后端 API 服务，支持 AI 对话、多媒体处理、支付交易等核心功能。

## 👥 用户画像 (Persona)
- **主要用户**：微信小程序前端、移动端用户
- **核心痛点**：需要流畅的 AI 对话体验、便捷的支付方式、可靠的文件上传
- **使用场景**：日常 AI 助手、多媒体内容处理、定位服务

## 🎯 V1: 最小可行产品 (MVP)

### 核心功能模块
1. **用户认证系统**
   - 微信登录（code2session）
   - JWT + Refresh Token 机制
   - 用户信息管理

2. **AI 对话系统**
   - OpenAI GPT 接入
   - 多轮对话支持
   - 消息历史管理

3. **媒体上传系统**
   - 支持 image/file/audio/video
   - Supabase Storage 集成
   - 预签名 URL 直传

4. **支付系统**
   - 微信支付 JSAPI
   - 免费额度管理（20条/天）
   - 超额按条计费（¥1/条）

5. **定位服务**
   - GPS 坐标上报
   - 定位历史记录

6. **系统监控**
   - 健康检查接口
   - 基础监控指标

## 🚀 V2 及以后版本 (Future Releases)

### 高级功能
1. **实时通信**
   - WebSocket 流式对话
   - 消息推送服务

2. **多模型支持**
   - Claude、Gemini 等模型
   - 模型智能路由

3. **高级支付**
   - 正式商户支付
   - 退款管理
   - 订单管理系统

4. **内容分析**
   - 语音转文字
   - 视频内容分析
   - 图像识别

5. **企业功能**
   - 团队管理
   - 使用分析
   - API 限流优化

## 📐 关键业务逻辑 (Business Rules)

### 免费额度规则
- 每用户每日免费 20 条消息（UTC+8 时区）
- 额度每日 00:00 重置
- 超额消费生成待支付订单

### 计费规则
- MVP 固定 ¥1/条消息
- 后付费模式：先消费→生成账单→支付
- 支付成功后继续使用

### 安全规则
- 所有敏感信息仅存储在服务端
- API 请求必须携带有效 JWT
- 微信支付回调验签必须通过
- 上传文件大小限制 20MB

## 💾 数据契约 (Data Contract)

### 核心数据表

#### Users 用户表
```sql
- id: 主键 (CUID)
- wechat_openid: 微信 OpenID (唯一)
- wechat_unionid: 微信 UnionID (可选)
- nickname: 昵称
- avatar_url: 头像 URL
- created_at, updated_at: 时间戳
```

#### Conversations 会话表
```sql
- id: 主键 (CUID)
- user_id: 用户 ID (外键)
- title: 会话标题
- created_at, updated_at: 时间戳
```

#### Messages 消息表
```sql
- id: 主键 (CUID)
- conversation_id: 会话 ID (外键)
- user_id: 用户 ID (外键)
- role: 角色 (user/assistant/system)
- content: 消息内容
- model: AI 模型名称
- token_count: Token 数量
- latency_ms: 响应延迟
- media_urls: 媒体文件 URLs (JSON)
- created_at: 时间戳
```

#### Media 媒体表
```sql
- id: 主键 (CUID)
- user_id: 用户 ID (外键)
- type: 文件类型 (image/file/audio/video)
- original_name: 原始文件名
- storage_path: 存储路径
- storage_url: 访问 URL
- size_bytes: 文件大小
- mime_type: MIME 类型
- metadata: 扩展元数据 (JSON)
- created_at: 时间戳
```

#### UserQuotas 用户额度表
```sql
- id: 主键 (CUID)
- user_id: 用户 ID (外键)
- date: 日期 (Date)
- used_count: 已使用条数
- free_limit: 免费额度
- created_at, updated_at: 时间戳
- 唯一约束: (user_id, date)
```

#### Payments 支付表
```sql
- id: 主键 (CUID)
- user_id: 用户 ID (外键)
- order_no: 订单号 (唯一)
- provider: 支付提供商 (wechat)
- amount: 金额 (分)
- currency: 币种 (CNY)
- status: 状态 (pending/paid/failed/refunded)
- prepay_id: 微信预支付 ID
- transaction_id: 微信交易号
- created_at, updated_at: 时间戳
```

#### LocationLogs 定位记录表
```sql
- id: 主键 (CUID)
- user_id: 用户 ID (外键)
- latitude: 纬度
- longitude: 经度
- accuracy: 精度
- timestamp: 定位时间戳
- metadata: 扩展数据 (JSON)
- created_at: 时间戳
```

#### Sessions 会话令牌表
```sql
- id: 主键 (CUID)
- user_id: 用户 ID (外键)
- refresh_token: 刷新令牌
- expires_at: 过期时间
- created_at: 时间戳
```

## 🔌 API 契约 (API Contract)

### 认证接口
```http
POST /api/auth/wechat
Content-Type: application/json

Request:
{
  "code": "微信登录 code",
  "user_info": {
    "nickname": "用户昵称",
    "avatar_url": "头像 URL"
  }
}

Response:
{
  "success": true,
  "data": {
    "user": {
      "id": "用户 ID",
      "nickname": "昵称",
      "avatar_url": "头像"
    },
    "tokens": {
      "access_token": "JWT 访问令牌",
      "refresh_token": "刷新令牌",
      "expires_in": 86400
    }
  }
}
```

### 对话接口
```http
POST /api/chat
Authorization: Bearer <access_token>
Content-Type: application/json

Request:
{
  "conversation_id": "会话 ID (可选，新会话不传)",
  "message": "用户消息",
  "media_urls": ["媒体文件 URL 数组 (可选)"]
}

Response:
{
  "success": true,
  "data": {
    "conversation_id": "会话 ID",
    "message": {
      "id": "消息 ID",
      "role": "assistant",
      "content": "AI 回复内容",
      "created_at": "2024-01-01T00:00:00Z"
    },
    "quota": {
      "used_today": 5,
      "free_limit": 20,
      "remaining": 15
    }
  }
}
```

### 文件上传接口
```http
POST /api/upload/presign
Authorization: Bearer <access_token>
Content-Type: application/json

Request:
{
  "filename": "example.jpg",
  "content_type": "image/jpeg",
  "size": 1024000
}

Response:
{
  "success": true,
  "data": {
    "upload_id": "上传 ID",
    "presigned_url": "预签名上传 URL",
    "form_data": {
      "key": "storage/path/file.jpg",
      "policy": "...",
      "signature": "..."
    }
  }
}

POST /api/upload/commit
Authorization: Bearer <access_token>
Content-Type: application/json

Request:
{
  "upload_id": "上传 ID",
  "storage_path": "实际存储路径"
}

Response:
{
  "success": true,
  "data": {
    "media": {
      "id": "媒体 ID",
      "url": "访问 URL",
      "type": "image",
      "size": 1024000
    }
  }
}
```

### 定位上报接口
```http
POST /api/location/report
Authorization: Bearer <access_token>
Content-Type: application/json

Request:
{
  "latitude": 39.9042,
  "longitude": 116.4074,
  "accuracy": 10.5,
  "timestamp": "2024-01-01T08:00:00Z"
}

Response:
{
  "success": true,
  "message": "定位上报成功"
}
```

### 支付接口
```http
POST /api/pay/checkout
Authorization: Bearer <access_token>
Content-Type: application/json

Request:
{
  "amount": 100,
  "description": "充值 1 元"
}

Response:
{
  "success": true,
  "data": {
    "order_no": "订单号",
    "pay_params": {
      "timeStamp": "时间戳",
      "nonceStr": "随机字符串",
      "package": "prepay_id=...",
      "signType": "RSA",
      "paySign": "签名"
    }
  }
}

POST /api/pay/wechat/webhook
Content-Type: application/json

Request: (微信支付回调)
{
  "id": "事件 ID",
  "create_time": "创建时间",
  "resource_type": "encrypt-resource",
  "event_type": "TRANSACTION.SUCCESS",
  "resource": {
    "ciphertext": "加密数据",
    "nonce": "随机数",
    "associated_data": "关联数据"
  }
}

Response:
{
  "code": "SUCCESS",
  "message": "成功"
}
```

### 健康检查接口
```http
GET /api/health

Response:
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00Z",
    "version": "1.0.0",
    "database": "connected",
    "storage": "connected"
  }
}
```

## ⚠️ 错误码规范

### HTTP 状态码
- `200`: 成功
- `400`: 请求参数错误
- `401`: 未授权（token 无效/过期）
- `403`: 禁止访问（权限不足）
- `404`: 资源不存在
- `429`: 请求过于频繁
- `500`: 服务器内部错误

### 业务错误码
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": "详细信息（可选）"
  }
}
```

#### 认证相关 (1xxx)
- `1001`: 微信 code 无效
- `1002`: JWT token 过期
- `1003`: Refresh token 无效
- `1004`: 用户不存在

#### 对话相关 (2xxx)
- `2001`: 会话不存在
- `2002`: 消息内容为空
- `2003`: AI 模型调用失败
- `2004`: 免费额度已用完

#### 上传相关 (3xxx)
- `3001`: 文件类型不支持
- `3002`: 文件大小超限
- `3003`: 上传失败
- `3004`: 存储服务不可用

#### 支付相关 (4xxx)
- `4001`: 订单不存在
- `4002`: 支付金额无效
- `4003`: 微信支付调用失败
- `4004`: 支付回调验签失败

#### 系统相关 (5xxx)
- `5001`: 数据库连接失败
- `5002`: 外部服务不可用
- `5003`: 服务器内部错误

## 🔧 环境变量清单

### 应用配置
```env
NODE_ENV=production
APP_PORT=3001
APP_BASE_URL=https://api.mornhub.net
FRONTEND_BASE_URL=https://www.mornhub.net
```

### 数据库配置
```env
DATABASE_URL=postgresql://user:pass@host:5432/dbname?schema=public
```

### 认证配置
```env
JWT_SECRET=your-super-secret-jwt-key-32-chars-minimum
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_EXPIRES_IN=7d
```

### 微信配置
```env
WECHAT_APP_ID=wxxxxxxxxxxx
WECHAT_APP_SECRET=xxxxxxxxxxxxxxxx
```

### 微信支付配置
```env
WECHAT_PAY_MCHID=1234567890
WECHAT_PAY_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
WECHAT_PAY_SERIAL_NO=xxxxxxxxxxxxxxxx
WECHAT_PAY_API_V3_KEY=xxxxxxxxxxxxxxxx
WECHAT_PAY_NOTIFY_URL=https://api.mornhub.net/api/pay/wechat/webhook
```

### OpenAI 配置
```env
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxx
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```

### Supabase 配置
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=xxxxxxxxxxxxxxxx
SUPABASE_SERVICE_KEY=xxxxxxxxxxxxxxxx
SUPABASE_STORAGE_BUCKET=mornhub-media
```

### 业务配置
```env
FREE_QUOTA_PER_DAY=20
PAID_PRICE_PER_MESSAGE_CNY=100
MAX_UPLOAD_SIZE_MB=20
RATE_LIMIT_PER_MINUTE=60
```

## 🏗️ 架构设计蓝图

### 系统架构图
```mermaid
graph TB
    subgraph "微信小程序"
        MP[小程序前端]
    end
    
    subgraph "Vercel (新加坡)"
        API[Next.js API]
        Auth[认证服务]
        Chat[对话服务]
        Upload[上传服务]
        Pay[支付服务]
        Location[定位服务]
    end
    
    subgraph "外部服务"
        WX[微信 API]
        OpenAI[OpenAI API]
        Supabase[Supabase 数据库]
        Storage[Supabase 存储]
    end
    
    MP --> API
    API --> Auth
    API --> Chat
    API --> Upload
    API --> Pay
    API --> Location
    
    Auth --> WX
    Chat --> OpenAI
    Upload --> Storage
    Pay --> WX
    
    Auth --> Supabase
    Chat --> Supabase
    Upload --> Supabase
    Pay --> Supabase
    Location --> Supabase
```

### 核心业务流程

#### 用户认证流程
```mermaid
sequenceDiagram
    participant MP as 小程序
    participant API as 后端 API
    participant WX as 微信 API
    participant DB as 数据库
    
    MP->>API: POST /api/auth/wechat {code}
    API->>WX: code2session
    WX-->>API: openid, session_key
    API->>DB: 查询/创建用户
    API->>API: 生成 JWT + Refresh Token
    API-->>MP: 返回 tokens
```

#### AI 对话流程
```mermaid
sequenceDiagram
    participant MP as 小程序
    participant API as 后端 API
    participant AI as OpenAI
    participant DB as 数据库
    
    MP->>API: POST /api/chat {message}
    API->>API: 验证 JWT
    API->>DB: 检查用户额度
    API->>AI: 调用 GPT API
    AI-->>API: 返回 AI 回复
    API->>DB: 保存对话记录
    API->>DB: 更新用户额度
    API-->>MP: 返回回复 + 额度信息
```

#### 文件上传流程
```mermaid
sequenceDiagram
    participant MP as 小程序
    participant API as 后端 API
    participant Storage as Supabase 存储
    participant DB as 数据库
    
    MP->>API: POST /api/upload/presign
    API->>Storage: 生成预签名 URL
    Storage-->>API: 返回上传凭证
    API-->>MP: 返回上传参数
    MP->>Storage: 直传文件
    Storage-->>MP: 上传成功
    MP->>API: POST /api/upload/commit
    API->>DB: 保存文件记录
    API-->>MP: 返回文件信息
```

### 技术选型分析

#### 优势
1. **Vercel + Next.js**: 自动扩容、海外节点、简化部署
2. **Supabase**: 数据库 + 存储一体化、实时功能、自动备份
3. **Prisma**: 类型安全、自动迁移、开发效率高
4. **JWT**: 无状态认证、水平扩展友好

#### 风险与缓解
1. **OpenAI API 稳定性**: 实现重试机制、降级方案
2. **微信支付回调**: 幂等处理、异步重试
3. **文件上传安全**: 类型检查、大小限制、病毒扫描
4. **数据库性能**: 索引优化、连接池管理

## 🚀 V2 功能路线图

### 阶段一：实时通信 (Q2)
- WebSocket 支持
- 流式对话响应
- 消息推送服务

### 阶段二：多模型支持 (Q3)
- Claude 3.5 接入
- Gemini Pro 接入
- 智能模型路由
- 成本优化算法

### 阶段三：高级功能 (Q4)
- 语音转文字
- 图像识别分析
- 视频内容理解
- 退款管理系统

### 阶段四：企业版 (Q1+1)
- 团队工作空间
- 使用统计分析
- API 使用配额
- 高级安全功能

---

**文档版本**: 1.0.0  
**最后更新**: 2024-01-01  
**负责人**: 后端架构师团队