# MornGPT 后端部署配置指南

## 🎯 配置概览

此项目当前使用**临时凭据**进行演示，面试官需要将以下凭据替换为自己的：

### 🔄 需要替换的凭据类型
1. **数据库连接** - Supabase PostgreSQL
2. **域名配置** - API域名和CORS设置 (`api.mornhub.net` → 您的域名)
3. **小程序合法域名** - 微信公众平台域名配置
4. **Vercel部署** - 部署账户和环境变量
5. **微信开发者** - AppID和AppSecret (可选，可继续使用现有)
6. **OpenAI API** - API密钥 (可选，可继续使用现有)

---

## 📋 当前使用的临时凭据

### 🗄️ 临时配置 (需要替换)
```
当前临时数据库: postgresql://postgres:[Haixiu0715]@db.wmkduonbmovhabdsxzzt.supabase.co:5432/postgres
当前临时域名: api.mornhub.net
小程序合法域名: https://api.mornhub.net (需要替换为您的域名)
```

### ✅ 可继续使用的凭据 
```
微信 AppID: wxfd931315db72075d
微信 AppSecret: [已配置]
OpenAI API Key: sk-proj-[您的API密钥] [已配置]
微信支付商户: [已配置]
```

---

## 🚀 部署步骤

### 第一步：准备您的Supabase数据库

1. **登录Supabase** → 创建新项目
2. **获取数据库连接字符串**：
   ```
   Project Settings → Database → Connection string → URI
   格式: postgresql://postgres:[YOUR_PASSWORD]@[YOUR_HOST]:5432/postgres
   ```

3. **部署数据库架构**：
   ```bash
   cd mvp28-backend
   npm install
   npx prisma db push
   ```

### 第二步：配置环境变量

复制 `.env.example` 为 `.env` 并修改：

```bash
# ===========================================
# 🔴 必须替换的配置
# ===========================================

# 数据库连接 (替换为您的Supabase连接字符串)
DATABASE_URL="postgresql://postgres:[YOUR_PASSWORD]@[YOUR_HOST]:5432/postgres"

# JWT密钥 (生成新的随机密钥)
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
JWT_REFRESH_SECRET="your-refresh-secret-key-min-32-chars"

# 域名配置 (替换为您的域名)
NEXTAUTH_URL="https://your-domain.vercel.app"
ALLOWED_ORIGINS="https://your-miniprogram-domain.com,https://your-domain.vercel.app"

# ===========================================
# ✅ 可选替换的配置 (现有凭据可继续使用)
# ===========================================

# 微信小程序 (可继续使用现有)
WECHAT_APP_ID="wxfd931315db72075d"
WECHAT_APP_SECRET="[现有密钥可继续使用]"

# OpenAI API (可继续使用现有)  
OPENAI_API_KEY="sk-proj-[您的OpenAI-API密钥]"
OPENAI_BASE_URL="https://api.openai.com/v1"

# 微信支付 (可继续使用现有)
WECHAT_PAY_MERCHANT_ID="[现有商户ID]"
WECHAT_PAY_PRIVATE_KEY="[现有私钥]"
WECHAT_PAY_CERT_SERIAL="[现有证书序列号]"
WECHAT_PAY_V3_KEY="[现有APIv3密钥]"
```

### 第三步：生成JWT密钥

```bash
# 生成32位随机字符串
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 第四步：部署到Vercel

1. **安装Vercel CLI**：
   ```bash
   npm i -g vercel
   ```

2. **登录您的Vercel账户**：
   ```bash
   vercel login
   ```

3. **部署项目**：
   ```bash
   cd mvp28-backend
   vercel --prod
   ```

4. **配置环境变量**：
   - 在Vercel Dashboard → Project Settings → Environment Variables
   - 添加所有 `.env` 中的变量

### 第五步：更新小程序配置

#### 5.1 修改API地址配置

**文件**: `/utils/config.js`
```javascript
const API_CONFIG = {
  // 生产环境 (替换为您的域名)
  production: 'https://api.mornhub.net'  // 替换为您的API域名
}
```

#### 5.2 配置小程序合法域名

在**微信公众平台** → **开发管理** → **开发设置** → **服务器域名**中配置：

```
# 小程序需要配置的合法域名 (全部替换为您的域名)
request合法域名: https://api.mornhub.net
uploadFile合法域名: https://api.mornhub.net  
downloadFile合法域名: https://api.mornhub.net
```

**⚠️ 重要说明**：
- 当前使用 `api.mornhub.net` 作为临时域名
- 面试官需要将所有域名替换为自己的域名
- 域名必须支持HTTPS
- 配置后需要重新提交小程序审核

---

## ⚠️ 重要检查清单

### 部署前检查
- [ ] Supabase数据库已创建并连接成功
- [ ] 数据库架构已部署 (`npx prisma db push`)
- [ ] JWT密钥已生成并配置
- [ ] Vercel环境变量已全部设置
- [ ] 小程序API地址已更新 (`utils/config.js`)
- [ ] 微信公众平台合法域名已配置 (`https://api.mornhub.net` → 您的域名)

### 部署后验证
- [ ] 健康检查API正常: `GET /api/health`
- [ ] 数据库连接正常 (health API返回database: "connected")
- [ ] 微信登录流程正常
- [ ] OpenAI API调用正常

---

## 🧪 测试验证

### 1. 健康检查
```bash
curl https://your-domain.vercel.app/api/health
```

期望返回：
```json
{
  "status": "healthy",
  "database": "connected", 
  "services": {
    "openai": "available",
    "wechat": "configured"
  }
}
```

### 2. 数据库连接测试
```bash
cd mvp28-backend
npx prisma db push
npx prisma studio  # 打开数据库管理界面
```

### 3. 小程序测试
- 微信开发者工具中预览小程序
- 测试登录流程
- 测试AI对话功能

---

## 🔧 故障排除

### 数据库连接失败
```
Error: P1001: Can't reach database server
```
**解决方案**：
1. 检查Supabase项目是否启动
2. 确认连接字符串格式正确
3. 检查数据库密码是否包含特殊字符需要URL编码

### Vercel部署失败
```
Error: Build failed
```
**解决方案**：
1. 检查环境变量是否完整
2. 确认Prisma schema语法正确
3. 查看Vercel构建日志详细错误

### API调用401错误
```
Error: 401 Unauthorized
```
**解决方案**：
1. 检查JWT_SECRET是否正确配置
2. 确认CORS域名设置正确
3. 验证微信AppID和AppSecret

---

## 📞 技术支持

如遇到配置问题，请检查：

1. **Vercel日志**: Functions → View Function Logs
2. **Supabase日志**: Project → Logs
3. **小程序调试**: 微信开发者工具 → Console

---

## 🎉 配置完成

当所有检查项都✅后，您的MornGPT后端就成功部署并运行了！

**最终架构**：
- 前端: 微信小程序 + Taro框架
- 后端: Next.js API Routes + Vercel部署  
- 数据库: PostgreSQL + Supabase
- AI服务: OpenAI GPT-4o
- 支付: 微信支付
- 认证: JWT + 微信登录
