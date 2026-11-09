import Vue from 'vue';
import App from './App.vue';
import axios from 'axios';

Vue.config.productionTip = false;

// 런타임 에러 핸들러
Vue.config.errorHandler = function(err, vm, info) {
  console.error('[Vue Runtime Error]:', err, info);
};

if (typeof window !== 'undefined') {
  window.addEventListener('error', function(event) {
    console.error('[Window Error]:', event.error || event.message);
  });
  window.addEventListener('unhandledrejection', function(event) {
    console.error('[Unhandled Promise Rejection]:', event.reason);
  });
}

// Axios 인스턴스 및 백엔드 서버 기본 URL 주입
Vue.prototype.axios = axios;
Vue.prototype.$rootUrl = (process.env.NODE_ENV === 'development')
  ? '/root/proxy/server'
  : `${window.location.origin}/server`;

new Vue({
  render: h => h(App)
}).$mount('#app');
