/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable API routes
  experimental: {
    appDir: false, // Use pages directory for API routes
  },
  
  // Environment variables validation
  env: {
    APP_ENV: process.env.APP_ENV,
    APP_BASE_URL: process.env.APP_BASE_URL,
  },
  
  // CORS and security headers
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: process.env.FRONTEND_BASE_URL || '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
        ],
      },
    ]
  },

  // Redirect root to API documentation
  async redirects() {
    return [
      {
        source: '/',
        destination: '/api/health',
        permanent: false,
      },
    ]
  },
}

module.exports = nextConfig