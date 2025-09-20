# MornGPT API 规范文档

## 📋 概述

本文档定义了 MornGPT 后端 API 的详细规范，包括请求/响应格式、错误码定义、认证机制等。

## 🔐 认证机制

### JWT Token 格式
```json
{
  "sub": "用户ID",
  "iat": 1640995200,
  "exp": 1641081600,
  "type": "access"
}
```

### 请求头格式
```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

## 📡 API 端点

### 1. 用户认证

#### POST /api/auth/wechat
微信登录接口

**请求体:**
```json
{
  "code": "string",           // 微信登录 code (必填)
  "user_info": {              // 用户信息 (可选)
    "nickname": "string",     // 昵称
    "avatar_url": "string"    // 头像 URL
  }
}
```

**响应体:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "cuid",
      "nickname": "string",
      "avatar_url": "string",
      "wechat_openid": "string"
    },
    "tokens": {
      "access_token": "jwt_string",
      "refresh_token": "string",
      "expires_in": 86400
    }
  }
}
```

#### POST /api/auth/refresh
刷新访问令牌

**请求体:**
```json
{
  "refresh_token": "string"
}
```

**响应体:**
```json
{
  "success": true,
  "data": {
    "access_token": "jwt_string",
    "expires_in": 86400
  }
}
```

### 2. AI 对话

#### POST /api/chat
发送聊天消息

**请求头:** 需要认证

**请求体:**
```json
{
  "conversation_id": "cuid",    // 会话 ID (可选，新会话不传)
  "message": "string",          // 用户消息 (必填)
  "media_urls": ["string"]      // 媒体文件 URL 数组 (可选)
}
```

**响应体:**
```json
{
  "success": true,
  "data": {
    "conversation_id": "cuid",
    "message": {
      "id": "cuid",
      "role": "assistant",
      "content": "string",
      "model": "gpt-4o-mini",
      "token_count": 150,
      "latency_ms": 1200,
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

#### GET /api/conversations
获取用户会话列表

**请求头:** 需要认证

**查询参数:**
- `page`: 页码 (默认: 1)
- `size`: 每页数量 (默认: 20)

**响应体:**
```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": "cuid",
        "title": "string",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z",
        "last_message": {
          "content": "string",
          "created_at": "2024-01-01T00:00:00Z"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "size": 20,
      "total": 50,
      "has_next": true
    }
  }
}
```

#### GET /api/conversations/:id/messages
获取会话消息历史

**请求头:** 需要认证

**查询参数:**
- `page`: 页码 (默认: 1)
- `size`: 每页数量 (默认: 50)

**响应体:**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "cuid",
        "role": "user",
        "content": "string",
        "media_urls": ["string"],
        "created_at": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "size": 50,
      "total": 200,
      "has_next": true
    }
  }
}
```

### 3. 文件上传

#### POST /api/upload/presign
获取预签名上传 URL

**请求头:** 需要认证

**请求体:**
```json
{
  "filename": "string",        // 文件名 (必填)
  "content_type": "string",    // MIME 类型 (必填)
  "size": 1024000             // 文件大小 (字节) (必填)
}
```

**响应体:**
```json
{
  "success": true,
  "data": {
    "upload_id": "uuid",
    "presigned_url": "string",
    "form_data": {
      "key": "string",
      "policy": "string",
      "x-amz-signature": "string",
      "x-amz-date": "string"
    }
  }
}
```

#### POST /api/upload/commit
确认文件上传完成

**请求头:** 需要认证

**请求体:**
```json
{
  "upload_id": "uuid",         // 上传 ID (必填)
  "storage_path": "string"     // 实际存储路径 (必填)
}
```

**响应体:**
```json
{
  "success": true,
  "data": {
    "media": {
      "id": "cuid",
      "type": "image",
      "original_name": "string",
      "storage_url": "string",
      "size_bytes": 1024000,
      "mime_type": "image/jpeg",
      "created_at": "2024-01-01T00:00:00Z"
    }
  }
}
```

### 4. 定位服务

#### POST /api/location/report
上报用户定位

**请求头:** 需要认证

**请求体:**
```json
{
  "latitude": 39.9042,         // 纬度 (必填)
  "longitude": 116.4074,       // 经度 (必填)
  "accuracy": 10.5,            // 精度 (米) (可选)
  "timestamp": "2024-01-01T08:00:00Z",  // 定位时间戳 (可选)
  "metadata": {                // 扩展数据 (可选)
    "speed": 5.2,
    "bearing": 180
  }
}
```

**响应体:**
```json
{
  "success": true,
  "message": "定位上报成功"
}
```

### 5. 支付系统

#### POST /api/pay/checkout
创建支付订单

**请求头:** 需要认证

**请求体:**
```json
{
  "amount": 100,               // 支付金额 (分) (必填)
  "description": "string"      // 订单描述 (可选)
}
```

**响应体:**
```json
{
  "success": true,
  "data": {
    "order_no": "string",
    "amount": 100,
    "pay_params": {
      "timeStamp": "string",
      "nonceStr": "string",
      "package": "prepay_id=...",
      "signType": "RSA",
      "paySign": "string"
    }
  }
}
```

#### POST /api/pay/wechat/webhook
微信支付回调 (仅微信服务器调用)

**请求体:**
```json
{
  "id": "string",
  "create_time": "string",
  "resource_type": "encrypt-resource",
  "event_type": "TRANSACTION.SUCCESS",
  "resource": {
    "ciphertext": "string",
    "nonce": "string",
    "associated_data": "string"
  }
}
```

**响应体:**
```json
{
  "code": "SUCCESS",
  "message": "成功"
}
```

#### GET /api/pay/orders
获取用户订单列表

**请求头:** 需要认证

**查询参数:**
- `page`: 页码 (默认: 1)
- `size`: 每页数量 (默认: 20)
- `status`: 订单状态 (可选: pending, paid, failed, refunded)

**响应体:**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "cuid",
        "order_no": "string",
        "amount": 100,
        "currency": "CNY",
        "status": "paid",
        "created_at": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "size": 20,
      "total": 10,
      "has_next": false
    }
  }
}
```

### 6. 用户信息

#### GET /api/user/profile
获取用户资料

**请求头:** 需要认证

**响应体:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "cuid",
      "nickname": "string",
      "avatar_url": "string",
      "created_at": "2024-01-01T00:00:00Z"
    },
    "quota": {
      "used_today": 5,
      "free_limit": 20,
      "remaining": 15
    },
    "statistics": {
      "total_conversations": 25,
      "total_messages": 300,
      "total_payments": 5
    }
  }
}
```

#### PUT /api/user/profile
更新用户资料

**请求头:** 需要认证

**请求体:**
```json
{
  "nickname": "string",        // 昵称 (可选)
  "avatar_url": "string"       // 头像 URL (可选)
}
```

**响应体:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "cuid",
      "nickname": "string",
      "avatar_url": "string",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  }
}
```

### 7. 系统监控

#### GET /api/health
健康检查

**响应体:**
```json
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
    },
    "metrics": {
      "uptime": 3600,
      "memory_usage": "128MB",
      "cpu_usage": "5%"
    }
  }
}
```

## ⚠️ 错误响应格式

### 标准错误响应
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": "详细信息",
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

### 字段验证错误
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数验证失败",
    "details": {
      "fields": [
        {
          "field": "message",
          "message": "消息内容不能为空"
        }
      ]
    }
  }
}
```

## 🚨 错误码定义

### HTTP 状态码
- `200` - 请求成功
- `400` - 请求参数错误
- `401` - 未授权 (token 无效/过期)
- `403` - 禁止访问 (权限不足)
- `404` - 资源不存在
- `409` - 资源冲突
- `429` - 请求过于频繁
- `500` - 服务器内部错误
- `502` - 外部服务不可用
- `503` - 服务暂时不可用

### 业务错误码

#### 认证相关 (AUTH_*)
- `AUTH_INVALID_CODE` - 微信 code 无效
- `AUTH_TOKEN_EXPIRED` - JWT token 过期
- `AUTH_TOKEN_INVALID` - JWT token 无效
- `AUTH_REFRESH_TOKEN_EXPIRED` - Refresh token 过期
- `AUTH_REFRESH_TOKEN_INVALID` - Refresh token 无效
- `AUTH_USER_NOT_FOUND` - 用户不存在
- `AUTH_WECHAT_API_ERROR` - 微信 API 调用失败

#### 对话相关 (CHAT_*)
- `CHAT_CONVERSATION_NOT_FOUND` - 会话不存在
- `CHAT_MESSAGE_EMPTY` - 消息内容为空
- `CHAT_MESSAGE_TOO_LONG` - 消息内容过长
- `CHAT_AI_MODEL_ERROR` - AI 模型调用失败
- `CHAT_QUOTA_EXCEEDED` - 免费额度已用完
- `CHAT_RATE_LIMITED` - 请求过于频繁

#### 上传相关 (UPLOAD_*)
- `UPLOAD_FILE_TYPE_NOT_SUPPORTED` - 文件类型不支持
- `UPLOAD_FILE_SIZE_EXCEEDED` - 文件大小超限
- `UPLOAD_PRESIGN_FAILED` - 预签名 URL 生成失败
- `UPLOAD_STORAGE_ERROR` - 存储服务错误
- `UPLOAD_ID_NOT_FOUND` - 上传 ID 不存在
- `UPLOAD_ALREADY_COMMITTED` - 文件已确认上传

#### 支付相关 (PAY_*)
- `PAY_ORDER_NOT_FOUND` - 订单不存在
- `PAY_AMOUNT_INVALID` - 支付金额无效
- `PAY_WECHAT_API_ERROR` - 微信支付 API 错误
- `PAY_SIGNATURE_INVALID` - 支付回调签名无效
- `PAY_ORDER_ALREADY_PAID` - 订单已支付
- `PAY_ORDER_EXPIRED` - 订单已过期

#### 定位相关 (LOCATION_*)
- `LOCATION_COORDINATES_INVALID` - 坐标格式无效
- `LOCATION_SAVE_FAILED` - 定位保存失败

#### 系统相关 (SYSTEM_*)
- `SYSTEM_DATABASE_ERROR` - 数据库连接错误
- `SYSTEM_EXTERNAL_SERVICE_ERROR` - 外部服务不可用
- `SYSTEM_INTERNAL_ERROR` - 服务器内部错误
- `SYSTEM_MAINTENANCE` - 系统维护中

#### 通用错误 (COMMON_*)
- `COMMON_VALIDATION_ERROR` - 请求参数验证失败
- `COMMON_RESOURCE_NOT_FOUND` - 资源不存在
- `COMMON_PERMISSION_DENIED` - 权限不足
- `COMMON_RATE_LIMITED` - 请求过于频繁

## 🔄 分页规范

### 请求参数
- `page`: 页码，从 1 开始 (默认: 1)
- `size`: 每页数量 (默认: 20，最大: 100)

### 响应格式
```json
{
  "pagination": {
    "page": 1,
    "size": 20,
    "total": 100,
    "has_next": true,
    "has_prev": false
  }
}
```

## 📅 时间格式

所有时间戳使用 ISO 8601 格式，UTC 时区：
```
2024-01-01T00:00:00Z
```

## 🔒 安全规范

### 请求限制
- 认证接口：5 次/分钟
- 对话接口：30 次/分钟
- 上传接口：10 次/分钟
- 其他接口：60 次/分钟

### 数据安全
- 所有敏感信息传输使用 HTTPS
- 用户密码不存储，仅通过微信认证
- 文件上传使用预签名 URL，避免直接传输到后端
- 支付回调必须验证签名

---

**文档版本**: 1.0.0  
**最后更新**: 2024-01-01  
**维护团队**: 后端开发组