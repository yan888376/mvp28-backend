#!/usr/bin/env node
// Multi-Chat API 自检脚本

const https = require('https');

// 测试配置
const CONFIG = {
  // 本地测试
  local: 'http://localhost:3001',
  // 生产环境
  production: 'https://mvp28-backend.vercel.app'
};

const TEST_CASES = [
  {
    name: 'OpenAI GPT-4o-mini',
    model: 'gpt-4o-mini',
    message: 'Hello, respond with exactly: "OpenAI GPT-4o-mini working"'
  },
  {
    name: 'OpenAI GPT-3.5-turbo', 
    model: 'gpt-3.5-turbo',
    message: 'Hello, respond with exactly: "GPT-3.5-turbo working"'
  },
  {
    name: 'Claude Haiku',
    model: 'claude-3-haiku',
    message: 'Hello, respond with exactly: "Claude Haiku working"'
  },
  {
    name: 'Google Gemini',
    model: 'gemini-1.5-flash', 
    message: 'Hello, respond with exactly: "Gemini working"'
  }
];

async function makeRequest(baseURL, endpoint, data) {
  const url = `${baseURL}${endpoint}`;
  
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 30000
    };

    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: response
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: body,
            parseError: error.message
          });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Request timeout')));
    req.write(postData);
    req.end();
  });
}

async function testHealth(baseURL) {
  console.log(`\n🏥 Testing Health Check: ${baseURL}/api/health`);
  
  try {
    const response = await makeRequest(baseURL, '/api/health', {});
    
    if (response.status === 200) {
      const health = response.data;
      console.log(`✅ Health Status: ${health.data?.status || health.status}`);
      
      if (health.data?.services?.ai) {
        const ai = health.data.services.ai;
        console.log(`🤖 AI Mode: ${ai.mode}`);
        console.log(`🌐 Gateway Ready: ${ai.gateway.ready}`);
        console.log(`🔑 Direct APIs: OpenAI=${ai.direct.openai}, Anthropic=${ai.direct.anthropic}, Google=${ai.direct.google}`);
      }
      
      return true;
    } else {
      console.log(`❌ Health check failed: ${response.status}`);
      console.log(response.data);
      return false;
    }
  } catch (error) {
    console.log(`❌ Health check error: ${error.message}`);
    return false;
  }
}

async function testMultiChat(baseURL, testCase) {
  console.log(`\n🧪 Testing ${testCase.name}...`);
  
  const payload = {
    message: testCase.message,
    model: testCase.model
  };
  
  const startTime = Date.now();
  
  try {
    const response = await makeRequest(baseURL, '/api/multi-chat', payload);
    const latency = Date.now() - startTime;
    
    if (response.status === 200 && response.data.success) {
      console.log(`✅ ${testCase.name}: SUCCESS (${latency}ms)`);
      console.log(`   Provider: ${response.data.data.provider}`);
      console.log(`   Mode: ${response.data.data.mode}`);
      console.log(`   Content: ${response.data.data.content.substring(0, 100)}...`);
      console.log(`   TraceID: ${response.data.data.traceId}`);
      return true;
    } else {
      console.log(`❌ ${testCase.name}: FAILED (${latency}ms)`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${response.data.error}`);
      console.log(`   Detail: ${response.data.detail}`);
      console.log(`   TraceID: ${response.data.traceId}`);
      return false;
    }
  } catch (error) {
    const latency = Date.now() - startTime;
    console.log(`❌ ${testCase.name}: ERROR (${latency}ms)`);
    console.log(`   ${error.message}`);
    return false;
  }
}

async function runTests() {
  const env = process.argv[2] || 'production';
  const baseURL = CONFIG[env];
  
  if (!baseURL) {
    console.log('❌ Invalid environment. Use: node test-multi-chat.js [local|production]');
    process.exit(1);
  }
  
  console.log(`\n🚀 Testing Multi-Chat API: ${baseURL}`);
  console.log(`📅 ${new Date().toISOString()}`);
  
  // 1. 健康检查
  const healthOK = await testHealth(baseURL);
  if (!healthOK) {
    console.log('\n❌ Health check failed. Aborting tests.');
    process.exit(1);
  }
  
  // 2. 模型测试
  let passedTests = 0;
  let totalTests = TEST_CASES.length;
  
  for (const testCase of TEST_CASES) {
    const success = await testMultiChat(baseURL, testCase);
    if (success) passedTests++;
    
    // 短暂延迟避免频率限制
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // 3. 结果汇总
  console.log(`\n📊 Test Results: ${passedTests}/${totalTests} passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Check configuration.');
    process.exit(1);
  }
}

// 运行测试
runTests().catch(error => {
  console.error('💥 Test runner error:', error);
  process.exit(1);
});