export default function Home() {
  return (
    <div style={{ padding: '40px', fontFamily: 'Arial, sans-serif' }}>
      <h1>MVP28 MornGPT Backend API</h1>
      <p>Backend service is running successfully!</p>
      <h2>Available Endpoints:</h2>
      <ul>
        <li><a href="/api/health">/api/health</a> - Health check</li>
        <li>/api/auth/wechat - WeChat authentication</li>
        <li>/api/chat - AI chat endpoint</li>
        <li>/api/pay/checkout - Payment checkout</li>
        <li>/api/upload/presign - File upload</li>
      </ul>
      <p><strong>Status:</strong> ✅ Ready for production</p>
    </div>
  )
}