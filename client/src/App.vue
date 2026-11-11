<template>
  <div id="app">
    <!-- 1. 로딩 인디케이터 (지니인사이트 브랜드 블루 스피너) -->
    <div v-if="is_load" class="full-height-container">
      <div class="centered-spinner">
        <div class="spinner" />
      </div>
    </div>

    <!-- 2. 요청 시간 만료 안내 화면 -->
    <div v-else-if="is_expired" class="full-height-container">
      <div class="centered-message">
        요청시간이 만료되었습니다.
      </div>
    </div>

    <!-- 3. 에러 발생 화면 -->
    <div v-else-if="is_error" class="full-height-container">
      <div class="centered-message error-text">
        {{ errorMessage || '에러가 발생했습니다.' }}
      </div>
    </div>

    <!-- 4. 정상 로드: 버전별 리포트 컴포넌트 마운트 -->
    <template v-else-if="is_open">
      <!-- v1 및 공통 스켈레톤 리포트 컴포넌트 -->
      <component
        :is="currentComponent"
        v-if="currentComponent"
        :data="data"
        :version="version"
      />

      <!-- 기타 미지원 컴포넌트 안내 -->
      <div v-else class="full-height-container">
        <div class="centered-message">
          지원하지 않는 결과지 버전입니다: ({{ version }})
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import {
  DEFAULT_VERSION,
  resolveVersionFromSeq,
  getVersionConfig,
  normalizeAssetPath
} from '@/config/versionConfig';

export default {
  name: 'App',
  components: {
    // 비동기 컴포넌트 매핑 (요청 버전 번들만 분할 로드)
    ReportV1: () => import('@/components/versions/ReportV1.vue')
  },
  data() {
    return {
      version: DEFAULT_VERSION,
      is_load: true,
      is_expired: false,
      is_error: false,
      is_open: false,
      errorMessage: '',
      data: undefined,
      contextMenuHandler: null
    };
  },
  computed: {
    versionConfig() {
      return getVersionConfig(this.version);
    },
    currentComponent() {
      const compName = this.versionConfig.component;
      return this.$options.components[compName] ? compName : null;
    }
  },
  created() {
    this.initApp();
  },
  mounted() {
    // 우클릭 방지 이벤트 등록
    this.contextMenuHandler = (event) => {
      event.preventDefault();
      alert('마우스 오른쪽 버튼은 사용할 수 없습니다.');
    };
    document.addEventListener('contextmenu', this.contextMenuHandler);
  },
  beforeDestroy() {
    if (this.contextMenuHandler) {
      document.removeEventListener('contextmenu', this.contextMenuHandler);
    }
    this.clearVersionStyles();
  },
  methods: {
    /**
     * 앱 초기화: 파라미터 파싱 -> 만료 검증 -> 버전 판별 -> 다중 CSS 동적 로드
     */
    async initApp() {
      try {
        // 1. 쿼리 스트링 data 파라미터 파싱
        const params = new URLSearchParams(window.location.search);
        const dataParam = params.get('data');

        if (!dataParam) {
          throw new Error('쿼리 스트링에 data 파라미터가 없습니다.');
        }

        // 2. Base64 안전 디코딩 및 JSON 파싱
        this.data = this.safeBase64Decode(dataParam);

        // 3. 만료시간(expire) 체크
        if (this.data && this.data.expire) {
          const expireTime = Number(this.data.expire);
          if (!isNaN(expireTime) && Date.now() > expireTime) {
            this.is_load = false;
            this.is_expired = true;
            return;
          }
        }

        // 4. 버전(version) 다단계 자동 판별 (Path 1순위 -> Query 2순위 -> template_version 3순위)
        this.detectVersion(this.data);

        // 5. 버전에 정의된 다중 CSS 격리 동적 로드
        await this.loadVersionStyles(this.version);

        this.is_load = false;
        this.is_open = true;

      } catch (error) {
        console.error('[App Init Error]:', error);
        this.is_load = false;
        this.is_error = true;
        this.errorMessage = `데이터 로드 중 오류가 발생했습니다: ${error.message}`;
        alert(this.errorMessage);
      }
    },

    /**
     * UTF-8 한글 및 특수문자 안전 Base64 디코더
     * (URLSearchParams에 의한 '+' -> 공백 치환 자동 복원 및 TextDecoder 적용)
     */
    safeBase64Decode(encodedStr) {
      if (!encodedStr) {
        throw new Error('데이터 파라미터가 비어 있습니다.');
      }
      const cleanStr = encodedStr.replace(/ /g, '+').replace(/%22/g, '"');
      try {
        const binary = atob(cleanStr);
        // UTF-8 멀티바이트 문자열 처리 (TextDecoder 지원 환경 우선)
        try {
          const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
          return JSON.parse(new TextDecoder().decode(bytes));
        } catch (e) {
          try {
            return JSON.parse(decodeURIComponent(escape(binary)));
          } catch (e2) {
            return JSON.parse(binary);
          }
        }
      } catch (err) {
        throw new Error(`Base64 데이터 디코딩에 실패했습니다 (${err.message})`);
      }
    },

    /**
     * 버전 자동 판별
     * 1순위: URL 경로 (/eng/v1/, /v1/, /viewer/ 등)
     * 2순위: 쿼리스트링 ?version=...
     * 3순위: 디코딩된 data.template_version (seq 번호 매핑)
     * 기본값: DEFAULT_VERSION ('v1')
     */
    detectVersion(decodedData) {
      const pathname = window.location.pathname.toLowerCase();

      // 1순위: 다단계 경로 특수 케이스 (/eng/v1 등)
      if (pathname.includes('/eng/v1')) {
        this.version = 'eng-v1';
        return;
      }

      // 1순위: 단일 경로 세그먼트 분석
      const segments = pathname.split('/').filter(Boolean);
      for (const seg of segments) {
        if (/^viewer$/i.test(seg)) {
          this.version = DEFAULT_VERSION;
          return;
        }
        if (/^v\d+$/i.test(seg)) {
          this.version = seg.toLowerCase();
          return;
        }
      }

      // 2순위: 쿼리스트링 ?version=...
      const params = new URLSearchParams(window.location.search);
      const queryVer = params.get('version');
      if (queryVer) {
        const lowerVer = queryVer.toLowerCase();
        this.version = lowerVer === 'viewer' ? DEFAULT_VERSION : lowerVer;
        return;
      }

      // 3순위: data.template_version (seq 매핑)
      if (decodedData && decodedData.template_version) {
        const resolved = resolveVersionFromSeq(decodedData.template_version);
        if (resolved) {
          this.version = resolved;
          return;
        }
      }

      // 기본값
      this.version = DEFAULT_VERSION;
    },

    /**
     * 이전 버전에 주입된 동적 <link> 태그 일괄 제거
     */
    clearVersionStyles() {
      const oldLinks = document.querySelectorAll('link[data-dtc-version-style]');
      oldLinks.forEach(link => link.remove());
    },

    /**
     * 에셋 상대경로 정규화 (서브디렉터리 URL 접근 시 상대경로 꼬임 방지)
     */
    normalizeAssetPath(relativePath) {
      return normalizeAssetPath(relativePath);
    },

    /**
     * 버전별 다중 CSS 독립 동적 로드 (Promise.all 병렬 대기 및 FOUC 방지)
     */
    async loadVersionStyles(version) {
      // 1. 기존 버전 스타일시트 격리 제거
      this.clearVersionStyles();

      const config = getVersionConfig(version);
      const styles = Array.isArray(config.styles) ? config.styles : [];

      if (styles.length === 0) {
        return Promise.resolve();
      }

      const cacheBust = Date.now();
      const loadPromises = styles.map((stylePath, idx) => {
        return new Promise((resolve) => {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.setAttribute('data-dtc-version-style', version);
          link.setAttribute('data-dtc-style-index', String(idx));

          const normalizedUrl = this.normalizeAssetPath(stylePath);
          link.href = `${normalizedUrl}?v=${cacheBust}`;

          link.onload = () => resolve();
          link.onerror = () => {
            console.warn(`[CSS Load Warning] 스타일시트를 로드하지 못했습니다: ${link.href}`);
            // 퍼블리싱 산출물 미존재 상태에서도 스켈레톤 화면 정상 동작을 위해 resolve 처리
            resolve();
          };

          // DOM 캐스케이딩 우선순위를 위해 순서대로 append
          document.head.appendChild(link);
        });
      });

      // 모든 CSS 로드가 완료된 후 리턴하여 화면 렌더링 깜빡임(FOUC) 차단
      await Promise.all(loadPromises);
    }
  }
};
</script>

<style scoped>
.full-height-container {
  height: 100vh;
  position: relative;
  background-color: #ffffff;
}

.centered-spinner {
  width: 50px;
  height: 50px;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.centered-message {
  width: 320px;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  font-size: 16px;
  color: #555555;
  line-height: 1.6;
}

.error-text {
  color: #f44336;
}

/* 지니인사이트 브랜드 메인 블루(#0c67df) 스피너 */
.spinner {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border: 4px solid #e0e6ed;
  border-bottom: 4px solid #0c67df;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
