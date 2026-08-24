import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // 文档管理（jill-ai-mcp 9010）
      '/api/vector': {
        target: 'http://localhost:9010',
        changeOrigin: true
      },
      // MCP 元数据（jill-ai-mcp 9010）
      '/api/metrics': {
        target: 'http://localhost:9010',
        changeOrigin: true
      },
      // 旧 Assistant 文档上传（向后兼容，仍走 9010）
      '/api/documents': {
        target: 'http://localhost:9010',
        changeOrigin: true
      },
      // AG-UI 协议（jill-ai-agent 8080）
      '/agui': {
        target: 'http://localhost:8080',
        changeOrigin: true
      },
      // 兜底：其它 /api 走 agent（虽然 agent 现在基本没用 /api）
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.js']
  }
})
