const { defineConfig } = require('@vue/cli-service')
const fs = require('fs')

function getProxyTarget() {
  if (process.env.DEV_PROXY_TARGET) {
    return process.env.DEV_PROXY_TARGET.replace(/\/+$/, '')
  }
  if (fs.existsSync('./.deploy.env')) {
    const envContent = fs.readFileSync('./.deploy.env', 'utf-8')
    const match = envContent.match(/REMOTE_HOST=["']?([^"'\r\n]+)["']?/)
    if (match && match[1]) {
      const host = match[1]
      return host.startsWith('http') ? host : `http://${host}`
    }
  }
  return 'http://localhost'
}

module.exports = defineConfig({
  transpileDependencies: true,
  // 상대경로 설정: 서버의 어떤 서브디렉터리(/view/, /v6/ 등)에 배포되어도 에셋 404 없이 서빙
  publicPath: './',
  chainWebpack: config => {
    config.plugin('html').tap(args => {
      args[0].hash = true;
      return args;
    });
  },
  // Webpack 5 + vue-loader 15 scoped CSS export 경고 필터링
  configureWebpack: {
    ignoreWarnings: [
      /export 'default' \(imported as 'style0'\) was not found in/
    ]
  },
  // 프록시 설정 (로컬 개발용)
  devServer: {
    proxy: {
      '/root/proxy': {
        target: getProxyTarget(),
        changeOrigin: true,
        pathRewrite: { '^/root/proxy': '' },
        secure: false,
        logLevel: 'debug'
      }
    }
  }
})
