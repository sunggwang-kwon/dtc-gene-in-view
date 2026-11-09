# dtc-gene-in-view

지니인사이트 차세대 유전자 검사 결과지 통합 뷰어 (v1 시작 및 다중 버전/다중 CSS 독립 관리)

---

## 1. 아키텍처 핵심 특징

1. **지니인사이트 v1 시작 규격**:
   - 기존 타 프로젝트의 레거시 버전 히스토리와 분리하여 지니인사이트 전용 뷰어 첫 번째 버전인 **`v1`부터 순차 관리**.
2. **상대경로 (Relative Public Path) 빌드**:
   - `vue.config.js`의 `publicPath: './'` 설정으로 웹 서버의 어떤 서브디렉터리(`/view/`, `/v1/`, `/viewer/` 등)에 배포되어도 에셋 404 없이 독립 서빙 가능.
3. **버전별 다중 CSS 독립 동적 로더 (`versionConfig.js` & `loadVersionStyles`)**:
   - 버전마다 1개 또는 여러 개의 CSS 파일(`styles: ['./v1/reset.css', './v1/common.css', './v1/style.css']`)을 독립 정의.
   - 버전 로드 시 이전 버전의 `<link>` 태그를 일괄 제거하여 스타일 간섭 원천 배제.
   - 캐시 버스팅(`?v=${Date.now()}`) 및 `Promise.all` 병렬 로드로 FOUC(Flash of Unstyled Content) 방지.
4. **다단계 버전 자동 라우팅 (`detectVersion`)**:
   - 1순위: URL 경로 분석 (`/v1/`, `/eng/v1/` 등)
   - 2순위: 쿼리스트링 (`?version=v1`)
   - 3순위: 디코딩된 페이로드 내 `data.template_version` (`lims_template.seq` 번호 매핑)
   - 기본값: 최신 `v1`
5. **지니인사이트 브랜드 공식 에셋 적용**:
   - `dtc-gene-in-admin`의 공식 SVG 파비콘, ICO 파비콘, 컬러 로고(`geni-in-logo.svg`), 심볼 마크(`symbol-logo.svg`) 적용.
   - 브랜드 메인 컬러인 `#0C67DF` 기반의 모던 스피너 및 UI 테마 일원화.
6. **공통 데이터 통신 믹스인 (`reportDataMixin.js`)**:
   - Base64 URL 파라미터(`data`) 안전 디코딩, 만료시간(`expire`) 체크.
   - 백엔드 PHP API 5종 병렬 조회(`base_info`, `summary`, `gene`, `related_gene`, `set_print_yn`).
   - 미검사 항목 방어 및 동적 페이지 번호(`updatePagination`) 계산.

---

## 2. 프로젝트 디렉터리 구조

```text
dtc-gene-in-view/
├── AGENTS.md                  # 에이전트 Role 및 운영 지침서
├── README.md                  # 본 프로젝트 안내서
└── client/
    ├── public/
    │   ├── index.html         # 메인 HTML 템플릿
    │   ├── favicon.svg        # 지니인사이트 공식 SVG 파비콘
    │   ├── favicon.ico        # 대체 ICO 파비콘
    │   ├── common/
    │   │   └── images/        # 공통 브랜드 로고 및 심볼
    │   │       ├── geni-in-logo.svg
    │   │       └── symbol-logo.svg
    │   └── v1/                # v1 퍼블리셔 에셋 독립 폴더
    │       ├── style.css      # v1 스타일시트
    │       └── images/        # v1 전용 이미지
    └── src/
        ├── App.vue            # 버전 감지, 다중 CSS 동적 로더, 최상위 컨테이너
        ├── main.js            # 엔트리 포인트, Axios 및 $rootUrl 설정
        ├── config/
        │   └── versionConfig.js # 버전별 컴포넌트, 다중 CSS 배열, seq 매핑 설정
        ├── mixins/
        │   └── reportDataMixin.js # 백엔드 API 연동 및 공통 헬퍼 믹스인
        └── components/
            ├── common/        # 공통 유전자 표 컴포넌트 4종
            │   ├── RepresentativeGene.vue
            │   ├── RepresentativeGene2.vue
            │   ├── RelatedGene.vue
            │   └── RelatedGene2.vue
            └── versions/
                └── ReportV1.vue # v1 결과지 컴포넌트 (퍼블리싱 HTML 이식 영역)
```

---

## 3. 신규 버전 및 다중 CSS 추가 절차

1. **정적 에셋 배치**:
   - `client/public/[version]/` 폴더를 생성하고 해당 버전의 CSS 파일들과 이미지를 배치합니다.
   - 예: `client/public/v2/reset.css`, `client/public/v2/style.css`, `client/public/v2/images/`
2. **설정 등록 (`client/src/config/versionConfig.js`)**:
   - `VERSION_CONFIG` 객체에 신규 버전을 등록하고, 적용할 CSS 파일들을 `styles` 배열에 순서대로 기재합니다.
   ```javascript
   v2: {
     name: 'v2',
     title: '지니인사이트 결과지 v2',
     component: 'ReportV2',
     langCd: 'kor',
     imageBaseUrl: './v2/images/',
     styles: [
       './v2/reset.css',
       './v2/style.css'
     ]
   }
   ```
   - 백엔드 템플릿 번호(seq)가 신규 발급된 경우 `TEMPLATE_SEQ_MAP`에 매핑을 추가합니다.
3. **버전 컴포넌트 생성**:
   - `client/src/components/versions/Report[Version].vue`를 생성하고 `reportDataMixin`을 주입합니다.
   - 납품받은 퍼블리셔 HTML을 템플릿에 이식하고 데이터 바인딩을 적용합니다.
4. **App.vue 비동기 컴포넌트 등록**:
   - `components` 객체에 비동기 import를 등록합니다:
     `ReportV2: () => import('@/components/versions/ReportV2.vue')`
5. **빌드 검증**:
   - `cd client && pnpm run build`를 실행하여 무결성을 검증합니다.
