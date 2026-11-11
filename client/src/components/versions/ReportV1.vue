<template>
  <div class="report-v1-container">
    <!-- 1. 데이터 로딩 인디케이터 -->
    <div v-if="is_data_loading" class="full-height-container">
      <div class="centered-spinner">
        <div class="spinner" />
      </div>
    </div>

    <!-- 2. 데이터 에러 안내 화면 -->
    <div v-else-if="is_data_error" class="full-height-container">
      <div class="centered-message">
        {{ data_error_message || '데이터를 불러오는 중 오류가 발생했습니다.' }}
      </div>
    </div>

    <!-- 3. 결과지 본문 -->
    <div v-else>
      <!-- 상단 인쇄 버튼 -->
      <div class="no-print print-button-container">
        <button @click="print" class="print-button">인쇄</button>
      </div>

      <!-- 환자별 리포트 루프 -->
      <div
        v-for="(result, pIdx) in result_list"
        :key="result.patient_id || pIdx"
        class="patient-report-item"
      >
        <!-- ============================================================== -->
        <!-- 스켈레톤 표지 및 기본정보 (퍼블리싱 전 데이터 검증용) -->
        <!-- ============================================================== -->
        <div class="page cover-page">
          <!-- 공식 로고 및 헤더 -->
          <div class="skeleton-header">
            <div class="skeleton-logo">
              <img :src="getLogoSrc()" alt="GeneInsight Logo">
            </div>
            <div class="skeleton-title">
              <h1>지니인사이트 유전자 검사 결과지</h1>
              <p>DTC GENETIC TEST REPORT (v1)</p>
            </div>
          </div>

          <!-- 검사 대상자 기본 인적사항 카드 -->
          <div class="skeleton-card">
            <h3>검사 대상자 기본 정보</h3>
            <div class="skeleton-grid">
              <div class="skeleton-row">
                <span class="skeleton-label">성명</span>
                <span class="skeleton-value">{{ result.patient_name || '-' }}</span>
              </div>
              <div class="skeleton-row">
                <span class="skeleton-label">성별</span>
                <span class="skeleton-value">{{ result.gender === 'M' ? '남성' : (result.gender === 'F' ? '여성' : '-') }}</span>
              </div>
              <div class="skeleton-row">
                <span class="skeleton-label">생년월일</span>
                <span class="skeleton-value">{{ result.birth_date || '-' }} (만 {{ result.age || '-' }}세)</span>
              </div>
              <div class="skeleton-row">
                <span class="skeleton-label">검체 등록번호(ID)</span>
                <span class="skeleton-value">{{ result.patient_id || '-' }}</span>
              </div>
              <div class="skeleton-row">
                <span class="skeleton-label">검체 채취일</span>
                <span class="skeleton-value">{{ result.collect_date || '-' }}</span>
              </div>
              <div class="skeleton-row">
                <span class="skeleton-label">검사 보고일</span>
                <span class="skeleton-value">{{ result.report_date || '-' }}</span>
              </div>
              <div class="skeleton-row">
                <span class="skeleton-label">검체 적합성</span>
                <span class="skeleton-value">{{ result.fit_yn === 'Y' ? '적합' : '부적합' }}</span>
              </div>
              <div class="skeleton-row">
                <span class="skeleton-label">검사 항목수</span>
                <span class="skeleton-value">{{ result.summary ? result.summary.length : 0 }}종</span>
              </div>
            </div>
          </div>

          <!-- 검사 항목 요약 통계 수신 현황 카드 -->
          <div class="skeleton-card">
            <h3>검사 분석 항목 통계 요약 (총 {{ result.summary ? result.summary.length : 0 }}건 수신됨)</h3>
            <table v-if="result.summary && result.summary.length > 0">
              <thead>
                <tr>
                  <th style="width: 15%;">분류</th>
                  <th style="width: 40%;">검사항목명</th>
                  <th style="width: 25%;">결과 판정</th>
                  <th style="width: 20%;">대표유전자 수</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(sumItem, sIdx) in result.summary.slice(0, 10)" :key="sumItem.test_type_id || sIdx">
                  <td>{{ sumItem.type_name || sumItem.type_id }}</td>
                  <td class="text">{{ sumItem.test_type_name || sumItem.test_type_id }}</td>
                  <td>
                    <span :class="get_level(sumItem.result)">{{ sumItem.result || '-' }}</span>
                  </td>
                  <td>{{ sumItem.gene ? sumItem.gene.length : 0 }}개</td>
                </tr>
              </tbody>
            </table>
            <div v-if="result.summary && result.summary.length > 10" style="margin-top: 10px; font-size: 12px; color: #888; text-align: center;">
              ... 외 {{ result.summary.length - 10 }}개 항목 데이터 로드 완료
            </div>
          </div>

          <!-- 퍼블리싱 산출물 결합 안내 블록 -->
          <div class="skeleton-notice">
            <h4>퍼블리셔 HTML/CSS 산출물 결합 대기 영역</h4>
            <p>
              현재 백엔드 API 연동, 파라미터 파싱, 버전 라우팅, 다중 CSS 동적 로더 및 데이터 바인딩 규격이 정상 작동 중입니다.<br>
              퍼블리싱 HTML 산출물이 납품되면 본 컴포넌트 템플릿에 통으로 이식하고, 해당 버전의 CSS 파일을 <code>client/public/v1/</code>에 배치하여 즉시 렌더링할 수 있습니다.
            </p>
          </div>

          <!-- 유전자 공통 컴포넌트 연동 슬롯 (퍼블리싱 전 렌더링 무결성 보장) -->
          <div v-if="result.summary && result.summary.length > 0 && result.summary[0].gene && result.summary[0].gene.length > 0" class="skeleton-card" style="margin-top: 24px;">
            <h3>대표 유전자 테이블 연동 검증 ({{ result.summary[0].test_type_name || result.summary[0].test_type_id }})</h3>
            <RepresentativeGene :data="result.summary[0].gene" />
          </div>
          <div v-if="false">
            <RepresentativeGene2 :data="[]" />
            <RelatedGene :data="[]" />
            <RelatedGene2 :data="[]" />
          </div>
        </div>

        <!-- ============================================================== -->
        <!-- TODO: 퍼블리싱 산출물 도착 시 본 위치에 페이지 단위 HTML을 순차 이식 -->
        <!-- ============================================================== -->
      </div>

      <!-- 하단 인쇄 버튼 -->
      <div class="no-print print-button-container">
        <button @click="print" class="print-button">인쇄</button>
      </div>
    </div>
  </div>
</template>

<script>
import reportDataMixin from '@/mixins/reportDataMixin';
import RepresentativeGene from '@/components/common/RepresentativeGene.vue';
import RepresentativeGene2 from '@/components/common/RepresentativeGene2.vue';
import RelatedGene from '@/components/common/RelatedGene.vue';
import RelatedGene2 from '@/components/common/RelatedGene2.vue';

export default {
  name: 'ReportV1',
  mixins: [reportDataMixin],
  components: {
    RepresentativeGene,
    RepresentativeGene2,
    RelatedGene,
    RelatedGene2
  },
  watch: {
    is_data_loading(newVal) {
      if (!newVal && this.result_list && this.result_list.length > 0) {
        this.$nextTick(() => {
          this.updatePagination();
        });
      }
    }
  },
  methods: {
    /**
     * 공식 로고 에셋 경로 반환 (서브디렉터리 접근 시에도 상대경로 깨짐 방지)
     */
    getLogoSrc() {
      return this.normalizeAssetPath('./common/images/geni-in-logo.svg');
    },

    /**
     * 버전별 이미지 경로 결합 헬퍼
     */
    getImg(path) {
      if (!path) return '';
      const clean = path.replace(/^(\.\/)?images\//, '');
      return this.normalizeAssetPath(`${this.imageBaseUrl}${clean}`);
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
