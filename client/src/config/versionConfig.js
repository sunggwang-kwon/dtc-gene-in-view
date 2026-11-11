/**
 * 지니인사이트 결과지 뷰어 버전 및 CSS 레지스트리 설정 (versionConfig.js)
 * 
 * - 지니인사이트 결과지 뷰어는 'v1'부터 시작합니다.
 * - 각 버전마다 1개 또는 복수의 CSS 파일 배열(styles)을 독립적으로 정의합니다.
 * - 신규 버전(v2, v3 등)이 추가되거나 특정 버전에 추가 CSS가 필요한 경우 본 설정에만 등록하면
 *   App.vue가 자동으로 격리 로드합니다.
 */

export const DEFAULT_VERSION = 'v1';

export const VERSION_CONFIG = {
  v1: {
    name: 'v1',
    title: '지니인사이트 결과지 v1',
    component: 'ReportV1',
    langCd: 'kor',
    imageBaseUrl: './v1/images/',
    // 버전마다 1개 이상의 CSS 파일을 순서대로 지정 (DOM 캐스케이딩 순서 보장)
    styles: [
      './v1/style.css'
      // 추후 퍼블리셔 산출물에 따라 './v1/reset.css', './v1/common.css' 등 복수 등록 가능
    ]
  },
  'eng-v1': {
    name: 'eng-v1',
    title: '지니인사이트 영문 결과지 v1',
    component: 'ReportV1',
    langCd: 'eng',
    imageBaseUrl: './eng-v1/images/',
    styles: [
      './eng-v1/style.css'
    ]
  }
};

// 레거시 URL 호환용 alias 등록 (/viewer 경로 접근 지원)
VERSION_CONFIG.viewer = VERSION_CONFIG.v1;

/**
 * 백엔드 lims_template 테이블의 seq 번호와 버전 식별자 매핑
 */
export const TEMPLATE_SEQ_MAP = {
  1: 'v1',      // v1
  9: 'v1',      // 지니인사이트 v1 연결
  7: 'eng-v1'   // 영문 v1
};

/**
 * seq 번호로부터 버전 식별자 도출
 */
export function resolveVersionFromSeq(seq) {
  if (!seq) return DEFAULT_VERSION;
  const num = Number(seq);
  if (TEMPLATE_SEQ_MAP[num]) {
    return TEMPLATE_SEQ_MAP[num];
  }
  return DEFAULT_VERSION;
}

/**
 * 버전 설정 조회 (미등록 버전 시 DEFAULT_VERSION 폴백)
 */
export function getVersionConfig(version) {
  const key = (version || '').toLowerCase();
  return VERSION_CONFIG[key] || VERSION_CONFIG[DEFAULT_VERSION];
}

/**
 * 에셋 상대경로 정규화 (서브디렉터리 URL 접근 시 슬래시 유무에 따른 상대경로 깨짐 방지)
 */
export function normalizeAssetPath(relativePath) {
  if (!relativePath) return '';
  if (/^(https?:)?\/\//i.test(relativePath)) return relativePath;

  // 현재 브라우저 문서가 위치한 디렉터리 기준 베이스 URL 계산
  let baseDir = window.location.pathname;
  if (!baseDir.endsWith('/')) {
    baseDir = baseDir.substring(0, baseDir.lastIndexOf('/') + 1);
  }

  // './' 제거 후 결합
  const cleanRelative = relativePath.replace(/^\.\//, '');
  return `${baseDir}${cleanRelative}`;
}
