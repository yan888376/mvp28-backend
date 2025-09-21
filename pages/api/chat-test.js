// 极简测试版本 - 不调用AI，直接返回
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message } = req.body;
    
    console.log('🧪 Test API called:', { message, timestamp: new Date().toISOString() });
    
    // 直接返回测试响应，不调用AI
    return res.status(200).json({
      success: true,
      data: {
        content: `测试响应: 你说了"${message}"，API连接正常！`,
        model: 'test-mode',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Test API Error:', error);
    return res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}