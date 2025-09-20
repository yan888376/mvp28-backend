#!/usr/bin/env node

/**
 * MornGPT API 测试脚本
 * 用于测试关键 API 端点的功能
 */

const https = require('https');
const http = require('http');

class APITester {
  constructor(baseUrl = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
    this.accessToken = null;
    this.conversationId = null;
  }

  // HTTP 请求工具
  async request(method, path, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(this.baseUrl + path);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;
      
      const defaultHeaders = {
        'Content-Type': 'application/json',
        'User-Agent': 'MornGPT-API-Tester/1.0'
      };
      
      if (this.accessToken) {
        defaultHeaders['Authorization'] = `Bearer ${this.accessToken}`;
      }
      
      const finalHeaders = { ...defaultHeaders, ...headers };
      
      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: method.toUpperCase(),
        headers: finalHeaders
      };
      
      if (data) {
        const jsonData = JSON.stringify(data);
        options.headers['Content-Length'] = Buffer.byteLength(jsonData);
      }
      
      const req = client.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          try {
            const json = JSON.parse(responseData);
            resolve({
              status: res.statusCode,
              headers: res.headers,
              data: json
            });
          } catch (e) {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              data: responseData
            });
          }
        });
      });
      
      req.on('error', (err) => {
        reject(err);
      });
      
      if (data) {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  }

  // 日志工具
  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
      info: '\x1b[36m',    // cyan
      success: '\x1b[32m', // green
      error: '\x1b[31m',   // red
      warning: '\x1b[33m', // yellow
      reset: '\x1b[0m'
    };
    
    console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
  }

  // 测试健康检查
  async testHealth() {
    this.log('🔍 测试健康检查...');
    
    try {
      const response = await this.request('GET', '/api/health');
      
      if (response.status === 200 && response.data.success) {
        this.log('✅ 健康检查通过', 'success');
        this.log(`   状态: ${response.data.data.status}`, 'info');
        this.log(`   版本: ${response.data.data.version}`, 'info');
        return true;
      } else {
        this.log('❌ 健康检查失败', 'error');
        this.log(`   状态码: ${response.status}`, 'error');
        return false;
      }
    } catch (error) {
      this.log(`❌ 健康检查错误: ${error.message}`, 'error');
      return false;
    }
  }

  // 测试微信认证
  async testWeChatAuth() {
    this.log('🔐 测试微信认证...');
    
    const authData = {
      code: 'test_code_123',
      user_info: {
        nickname: '测试用户',
        avatar_url: 'https://example.com/avatar.jpg'
      }
    };
    
    try {
      const response = await this.request('POST', '/api/auth/wechat', authData);
      
      if (response.status === 200 && response.data.success) {
        this.accessToken = response.data.data.tokens.access_token;
        this.log('✅ 微信认证成功', 'success');
        this.log(`   用户ID: ${response.data.data.user.id}`, 'info');
        this.log(`   Access Token: ${this.accessToken.substring(0, 20)}...`, 'info');
        return true;
      } else {
        this.log('❌ 微信认证失败', 'error');
        this.log(`   状态码: ${response.status}`, 'error');
        if (response.data.error) {
          this.log(`   错误: ${response.data.error.message}`, 'error');
        }
        return false;
      }
    } catch (error) {
      this.log(`❌ 微信认证错误: ${error.message}`, 'error');
      return false;
    }
  }

  // 测试聊天接口
  async testChat() {
    this.log('💬 测试聊天接口...');
    
    if (!this.accessToken) {
      this.log('⚠️  没有访问令牌，跳过聊天测试', 'warning');
      return false;
    }
    
    const chatData = {
      message: '你好，这是一条测试消息，请简短回复。'
    };
    
    try {
      const response = await this.request('POST', '/api/chat', chatData);
      
      if (response.status === 200 && response.data.success) {
        this.conversationId = response.data.data.conversation_id;
        const aiMessage = response.data.data.message;
        const quota = response.data.data.quota;
        
        this.log('✅ 聊天消息发送成功', 'success');
        this.log(`   会话ID: ${this.conversationId}`, 'info');
        this.log(`   AI回复: ${aiMessage.content.substring(0, 100)}...`, 'info');
        this.log(`   模型: ${aiMessage.model}`, 'info');
        this.log(`   Token数: ${aiMessage.token_count}`, 'info');
        this.log(`   今日已用: ${quota.used_today}/${quota.free_limit}`, 'info');
        return true;
      } else {
        this.log('❌ 聊天消息发送失败', 'error');
        this.log(`   状态码: ${response.status}`, 'error');
        if (response.data.error) {
          this.log(`   错误: ${response.data.error.message}`, 'error');
        }
        return false;
      }
    } catch (error) {
      this.log(`❌ 聊天接口错误: ${error.message}`, 'error');
      return false;
    }
  }

  // 测试文件上传预签名
  async testUploadPresign() {
    this.log('📤 测试文件上传预签名...');
    
    if (!this.accessToken) {
      this.log('⚠️  没有访问令牌，跳过上传测试', 'warning');
      return false;
    }
    
    const uploadData = {
      filename: 'test-image.jpg',
      content_type: 'image/jpeg',
      size: 102400
    };
    
    try {
      const response = await this.request('POST', '/api/upload/presign', uploadData);
      
      if (response.status === 200 && response.data.success) {
        this.log('✅ 文件上传预签名成功', 'success');
        this.log(`   上传ID: ${response.data.data.upload_id}`, 'info');
        this.log(`   预签名URL: ${response.data.data.presigned_url.substring(0, 50)}...`, 'info');
        return true;
      } else {
        this.log('❌ 文件上传预签名失败', 'error');
        this.log(`   状态码: ${response.status}`, 'error');
        if (response.data.error) {
          this.log(`   错误: ${response.data.error.message}`, 'error');
        }
        return false;
      }
    } catch (error) {
      this.log(`❌ 文件上传预签名错误: ${error.message}`, 'error');
      return false;
    }
  }

  // 测试定位上报
  async testLocationReport() {
    this.log('📍 测试定位上报...');
    
    if (!this.accessToken) {
      this.log('⚠️  没有访问令牌，跳过定位测试', 'warning');
      return false;
    }
    
    const locationData = {
      latitude: 39.9042,
      longitude: 116.4074,
      accuracy: 10.5,
      timestamp: new Date().toISOString()
    };
    
    try {
      const response = await this.request('POST', '/api/location/report', locationData);
      
      if (response.status === 200 && response.data.success) {
        this.log('✅ 定位上报成功', 'success');
        return true;
      } else {
        this.log('❌ 定位上报失败', 'error');
        this.log(`   状态码: ${response.status}`, 'error');
        if (response.data.error) {
          this.log(`   错误: ${response.data.error.message}`, 'error');
        }
        return false;
      }
    } catch (error) {
      this.log(`❌ 定位上报错误: ${error.message}`, 'error');
      return false;
    }
  }

  // 测试用户资料
  async testUserProfile() {
    this.log('👤 测试用户资料...');
    
    if (!this.accessToken) {
      this.log('⚠️  没有访问令牌，跳过用户资料测试', 'warning');
      return false;
    }
    
    try {
      const response = await this.request('GET', '/api/user/profile');
      
      if (response.status === 200 && response.data.success) {
        const user = response.data.data.user;
        const quota = response.data.data.quota;
        const stats = response.data.data.statistics;
        
        this.log('✅ 用户资料获取成功', 'success');
        this.log(`   昵称: ${user.nickname}`, 'info');
        this.log(`   今日额度: ${quota.used_today}/${quota.free_limit}`, 'info');
        this.log(`   总会话数: ${stats.total_conversations}`, 'info');
        this.log(`   总消息数: ${stats.total_messages}`, 'info');
        return true;
      } else {
        this.log('❌ 用户资料获取失败', 'error');
        this.log(`   状态码: ${response.status}`, 'error');
        if (response.data.error) {
          this.log(`   错误: ${response.data.error.message}`, 'error');
        }
        return false;
      }
    } catch (error) {
      this.log(`❌ 用户资料错误: ${error.message}`, 'error');
      return false;
    }
  }

  // 运行所有测试
  async runAllTests() {
    this.log('🚀 开始运行 MornGPT API 测试套件', 'info');
    this.log(`🌐 API 地址: ${this.baseUrl}`, 'info');
    this.log('=' * 50, 'info');
    
    const tests = [
      { name: '健康检查', fn: () => this.testHealth() },
      { name: '微信认证', fn: () => this.testWeChatAuth() },
      { name: '用户资料', fn: () => this.testUserProfile() },
      { name: '聊天接口', fn: () => this.testChat() },
      { name: '文件上传', fn: () => this.testUploadPresign() },
      { name: '定位上报', fn: () => this.testLocationReport() }
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const test of tests) {
      try {
        const result = await test.fn();
        if (result) {
          passed++;
        } else {
          failed++;
        }
      } catch (error) {
        this.log(`❌ 测试 ${test.name} 出现异常: ${error.message}`, 'error');
        failed++;
      }
      
      this.log('', 'info'); // 空行分隔
    }
    
    this.log('=' * 50, 'info');
    this.log(`📊 测试结果: ${passed} 通过, ${failed} 失败`, passed > failed ? 'success' : 'error');
    
    if (failed === 0) {
      this.log('🎉 所有测试通过！', 'success');
      process.exit(0);
    } else {
      this.log('⚠️  有测试失败，请检查日志', 'warning');
      process.exit(1);
    }
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  const baseUrl = args[0] || 'http://localhost:3001';
  
  const tester = new APITester(baseUrl);
  await tester.runAllTests();
}

// 运行测试
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ 测试运行失败:', error.message);
    process.exit(1);
  });
}

module.exports = APITester;