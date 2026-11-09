# DTC-GENE-IN-VIEW 프로젝트 에이전트 가이드 (AGENTS.md)

이 문서는 `dtc-gene-in-view` (지니인사이트 차세대 유전자 검사 결과지 통합 뷰어) 프로젝트의 아키텍처 원칙, 개발/유지보수 지침 및 운영 규칙을 정리한 지침서입니다.

---

## 1. 프로젝트 개요 및 기술 스택

- **프로젝트명**: dtc-gene-in-view (지니인사이트 유전자 검사 결과지 통합 뷰어)
- **주요 역할**:
  - `dtc-gene-in` (수검자 포털) 및 `dtc-gene-in-admin` (관리자 시스템)에서 요청한 유전자 검사 결과지를 웹 화면에 렌더링하고 인쇄를 제공하는 전용 뷰어.
  - 버전마다 독립된 다중 CSS 격리 로드 및 단일 프로젝트 내 다중 버전 통합 서빙.
- **프론트엔드 프레임워크**:
  - **Vue 2** (`vue@^2.6.14`)
  - **HTTP 통신**: Axios (`axios@^1.4.0`)
  - **고유 식별자**: UUID v4 (`uuid@^11.0.5`)
- **패키지 매니저**: **`pnpm` 전용** (`npm` 사용 절대 금지)
- **배포 환경**:
  - Web Server: Apache 2.4 (Ubuntu) + PHP 7.4
  - 자격증명 관리: Google Cloud Secret Manager(`sgkwon-vault`)의 `DTC_GENE_SFTP_*` 시크릿 참조
  - 배포 대상 경로: `/var/www/html/view`

---

## 2. 작업 절대 원칙 (Strict Rules)

### 2.1. 배포 및 원격 접속 제한
1. **Deploy 절대 금지 원칙**: 사용자의 직접적이고 명시적인 지시("배포해", "배포 진행" 등)가 있기 전까지 배포 스크립트 실행(`bash deploy.sh`, `pnpm run deploy`)은 절대 금지합니다.
2. **원격 서버 SSH 접속 금지**: 사용자의 사전 승인 없이 원격 서버 SSH 직접 접속을 시도하지 않습니다.

### 2.2. 패키지 매니저 규칙
- 반드시 **`pnpm`**만 사용합니다. `npm` 명령어 실행은 엄격히 금지합니다.
- 의존성 버전 고정은 `pnpm-lock.yaml`을 기준으로 관리합니다.

### 2.3. 에러 핸들링 및 코드 수정 전 승인 규칙 (5단계 준수)
문제 발생 시 코드를 즉시 임의 수정하지 않고, **문제 보고 ➔ 증거 제시 ➔ 원인 분석 ➔ 수정안 제안 ➔ 사용자 승인 대기** 단계를 거친 후 명시적 승인이 있을 때만 수정합니다.

### 2.4. AI 에이전트 응답 및 커뮤니케이션 규칙 (Strict Communication Rules) - 절대 준수
- AI 에이전트는 사용자와의 모든 답변, 작업 보고, 설명, 요약 등에서 **이모지(각종 유니코드 이모지 심볼), 텍스트 이모티콘(^^, :), ㅠㅠ 등), 스티커성 그래픽 기호를 일절 사용하지 않습니다.**
- 장식적인 이모티콘을 완전히 배제하고, 오직 **명확하고 건조하며 전문적인 텍스트와 표준 마크다운(글머리 기호, 볼드, 표, 코드 블록 등)**으로만 간결하게 소통합니다.

### 2.5. 설계 문서 관리 규칙 (Architecture Docs)
- **설계/계획 문서 저장 경로**: `/home/sgkwon/git/architecture/dtc-gene/`
- 파일이나 디렉터리 경로를 언급할 때는 클릭 가능한 파일 링크 형태(`[파일명](file:///전체경로)`)와 독립된 코드 블록(```path 또는 ```text) 안의 전체 경로를 각각 한 줄씩 함께 작성합니다.

---

## 3. 핵심 아키텍처 원칙 (Core Architecture)

### 원칙 1: 버전별 다중 CSS 독립 격리 동적 로드 (`loadVersionStyles`)
- 버전마다 여러 개의 CSS 파일(`styles: [...]`)이 존재할 수 있습니다.
- `client/src/config/versionConfig.js`의 `styles` 배열에 등록된 순서대로 `<head>`에 동적 삽입됩니다.
- 이전 버전에 주입된 `<link data-dtc-version-style>` 태그는 버전 전환 시 일괄 제거되어 다른 버전의 CSS와 절대 간섭하지 않습니다.
- 모든 CSS가 로드된 후 화면이 오픈되도록 `Promise.all`로 대기하여 스타일 깨짐 현상(FOUC)을 방지합니다.

### 원칙 2: 3단계 버전 자동 감지 라우팅 (`detectVersion`)
1. **1순위 (URL Path)**: `/eng/v1/`, `/v1/`, `/viewer/` 등 URL 경로 세그먼트 분석.
2. **2순위 (Query String)**: `?version=...` 쿼리스트링 분석.
3. **3순위 (Payload)**: `data.template_version` (`lims_template.seq`) 매핑 테이블 조회.
4. **기본값**: 첫 번째 기준 버전인 `'v1'` 적용.

### 원칙 3: 데이터 계층 분리 (`reportDataMixin.js`)
- 백엔드 API 통신(`get_result_base_info`, `get_result_summary`, `get_result_gene`, `get_result_related_gene`, `set_print_yn`), Base64 안전 디코딩, 인쇄 이벤트 등록, 날짜 변환 등은 믹스인에 캡슐화합니다.
- 버전 컴포넌트는 `result_list`를 주입받아 화면에 바인딩하는 프리젠테이션 역할만 수행합니다.

### 원칙 4: 지니인사이트 브랜드 아이덴티티 통일
- 공식 SVG 파비콘, ICO 파비콘, 풀 로고(`geni-in-logo.svg`), 심볼 마크(`symbol-logo.svg`)를 적용합니다.
- 기본 UI 테마 및 로딩 스피너에 지니인사이트 Primary 컬러인 `#0C67DF`를 사용합니다.

---

## 4. 빌드 및 배포 절차

1. **빌드**: `cd client && pnpm run build`
2. **배포**: `bash deploy.sh -y` (반드시 사용자 명시적 지시 확인 후 수행)
3. **배포 후 검증**:
   - 브라우저 강력 새로고침(`Ctrl + F5`) 확인
   - `https://[도메인]/view/?data=...` 실 URL로 렌더링 무결성 검증
