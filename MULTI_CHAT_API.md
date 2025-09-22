# Multi-Chat API 双通道架构文档

## 概述

Multi-Chat API 支持通过 Vercel AI Gateway 或直连模式调用多个 AI 提供商，实现统一的聊天接口。

## 架构特性

### 🔄 双通道模式
- **Gateway模式（推荐）**: 通过 Vercel AI Gateway 统一调用
- **Direct模式（兜底）**: 直接连接各供应商 API

### 🎯 统一接口
```
POST /api/multi-chat
```

### 📋 支持的模型

| 模型名称 | 供应商 | Gateway路径 | 直连地址 |
|---------|--------|-------------|----------|
| gpt-4o-mini | OpenAI | /openai/v1 | api.openai.com |
| gpt-4o | OpenAI | /openai/v1 | api.openai.com |
| gpt-3.5-turbo | OpenAI | /openai/v1 | api.openai.com |
| claude-3-haiku | Anthropic | /anthropic/v1 | api.anthropic.com |
| claude-3-sonnet | Anthropic | /anthropic/v1 | api.anthropic.com |
| gemini-1.5-flash | Google | /google | generativelanguage.googleapis.com |
| groq-llama3-70b | Groq | /groq/v1 | api.groq.com |

## 环境变量配置

### 通用配置
```bash
USE_GATEWAY=true  # 启用Gateway模式
```

### Gateway模式配置
```bash
AI_GATEWAY_URL=https://gateway.ai.vercel.app  # Gateway URL
AI_GATEWAY_TOKEN=vag_xxxxx                    # Gateway Token
```

### Direct模式配置
```bash
OPENAI_API_KEY=sk-xxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxx
GOOGLE_API_KEY=AIzaSyxxxxx
GROQ_API_KEY=gsk_xxxxx
COHERE_API_KEY=xxxxx
OPENROUTER_API_KEY=sk-or-xxxxx
```

## API 接口

### 请求格式

#### 方式1: 单消息格式（兼容旧版本）
```json
{
  "message": "你好",
  "model": "gpt-4o-mini",
  "context": [
    {"role": "user", "content": "之前的对话"},
    {"role": "assistant", "content": "AI回复"}
  ]
}
```

#### 方式2: 消息数组格式（推荐）
```json
{
  "messages": [
    {"role": "user", "content": "你好"},
    {"role": "assistant", "content": "你好！有什么可以帮助你的吗？"},
    {"role": "user", "content": "介绍一下自己"}
  ],
  "model": "gpt-4o-mini"
}
```

### 成功响应
```json
{
  "success": true,
  "data": {
    "content": "AI生成的回复内容",
    "model": "gpt-4o-mini",
    "provider": "openai",
    "mode": "gateway",
    "latency": "1234ms",
    "traceId": "uuid-trace-id"
  }
}
```

### 错误响应
```json
{
  "error": "UPSTREAM_ERROR",
  "provider": "openai",
  "mode": "gateway", 
  "status": 429,
  "detail": "Rate limit exceeded",
  "traceId": "uuid-trace-id"
}
```

## 健康检查

### 获取系统状态
```bash
GET /api/health
```

### 响应示例
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "services": {
      "ai": {
        "mode": "gateway",
        "gateway": {
          "enabled": true,
          "url_configured": true,
          "token_configured": true,
          "ready": true
        },
        "direct": {
          "openai": true,
          "anthropic": false,
          "google": true,
          "groq": false
        }
      }
    }
  }
}
```

## 测试和验证

### 自动化测试
```bash
# 测试生产环境
node scripts/test-multi-chat.js production

# 测试本地环境  
node scripts/test-multi-chat.js local
```

### 手动测试
```bash
# 测试 OpenAI 模型
curl -X POST https://mvp28-backend.vercel.app/api/multi-chat \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o-mini","message":"ping"}'

# 测试 Anthropic 模型
curl -X POST https://mvp28-backend.vercel.app/api/multi-chat \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-3-haiku","message":"ping"}'
```

## 故障排除

### 常见问题

#### 1. "AI_GATEWAY_TOKEN not configured"
- **原因**: Gateway模式下缺少Token
- **解决**: 在Vercel环境变量中设置 `AI_GATEWAY_TOKEN`

#### 2. "OPENAI_API_KEY not configured"  
- **原因**: Direct模式下缺少API密钥
- **解决**: 设置对应供应商的API密钥环境变量

#### 3. "Unsupported model: xxx"
- **原因**: 请求的模型不在 MODEL_REGISTRY 中
- **解决**: 检查模型名称或添加新模型到路由表

#### 4. "UPSTREAM_ERROR" with 401
- **原因**: API密钥无效或过期
- **解决**: 验证并更新对应的API密钥

#### 5. "UPSTREAM_ERROR" with 429
- **原因**: 达到频率限制
- **解决**: 降低请求频率或升级API套餐

### 调试步骤

1. **检查健康状态**
   ```bash
   curl https://mvp28-backend.vercel.app/api/health
   ```

2. **查看Vercel日志**
   - 访问 Vercel Dashboard → Functions → View Logs
   - 搜索 traceId 定位具体请求

3. **验证环境变量**
   - 确保所有必需的环境变量已设置
   - 检查变量值没有前后空格或换行符

4. **测试单个模型**
   ```bash
   node scripts/test-multi-chat.js production
   ```

## 性能指标

### 延迟对比
- **Gateway模式**: 通常增加100-200ms延迟
- **Direct模式**: 直连，延迟最低

### 可靠性
- **Gateway模式**: 自动故障转移，更稳定
- **Direct模式**: 依赖单个供应商可用性

## 小程序集成

### 请求示例
```javascript
// 在 request.js 中
const api = {
  multiChat: (message, model = 'gpt-4o-mini', context = []) => {
    return request({
      url: '/api/multi-chat',
      method: 'POST',
      data: { message, model, context }
    })
  }
}
```

### 错误处理
```javascript
try {
  const response = await api.multiChat(message, model);
  if (response.success) {
    // 显示AI回复
    console.log(response.data.content);
  }
} catch (error) {
  // 显示错误信息
  console.error('AI服务暂时不可用:', error.detail);
}
```

## 更新日志

### v2.0.0 (2025-09-22)
- 重构为双通道架构
- 支持多个AI供应商
- 增加详细的错误信息和traceId
- 添加健康检查接口
- 完善自动化测试

### v1.0.0
- 基础单供应商实现