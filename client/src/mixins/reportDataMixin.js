/**
 * 지니인사이트 유전자 검사 결과지 공통 데이터 믹스인 (reportDataMixin.js)
 * 
 * - 역할: 백엔드 API 연동, 데이터 파싱, 인쇄 이벤트 처리, 공통 헬퍼 메서드를 단일 모듈로 캡슐화.
 * - 버전별 컴포넌트는 이 믹스인을 주입받아 result_list를 바로 템플릿에 바인딩합니다.
 */

import { getVersionConfig } from '@/config/versionConfig';

export default {
  props: {
    data: {
      type: Object,
      required: true
    },
    version: {
      type: String,
      default: 'v1'
    }
  },
  data() {
    const config = getVersionConfig(this.version);
    return {
      is_data_loading: true,
      is_data_error: false,
      data_error_message: '',
      result_list: [],
      langCd: config.langCd || 'kor',
      imageBaseUrl: config.imageBaseUrl || './v1/images/'
    };
  },
  computed: {
    headers() {
      return this.data?.headers || {};
    },
    param() {
      return this.data?.param || [];
    }
  },
  created() {
    this.initReportData();
  },
  mounted() {
    this.registerPrintHandler();
  },
  methods: {
    /**
     * 결과 데이터 로드 및 초기화
     */
    async initReportData() {
      if (!this.param || this.param.length === 0) {
        this.is_data_loading = false;
        this.is_data_error = true;
        this.data_error_message = '조회 대상 환자 파라미터가 없습니다.';
        return;
      }

      await this.fetchResultData();
    },

    /**
     * 브라우저 인쇄 창 호출
     */
    print() {
      window.print();
    },

    /**
     * 인쇄 시 서버에 출력 여부 전송 (set_print_yn.php)
     */
    registerPrintHandler() {
      window.onbeforeprint = () => {
        if (!Array.isArray(this.result_list)) return;
        this.result_list.forEach((element) => {
          if (!element.patient_id || !element.request_date) return;
          const cleanDate = element.request_date
            .replace(/년\s?|월\s?/g, '-')
            .replace('일', '')
            .trim();

          this.axios({
            method: 'post',
            url: `${this.$rootUrl}/result/set_print_yn.php`,
            headers: this.headers,
            params: {
              patient_id: element.patient_id,
              request_date: cleanDate
            },
            responseType: 'json'
          }).catch((err) => {
            console.error('[set_print_yn 실패]:', err);
          });
        });
      };
    },

    /**
     * 전체 환자 목록에 대해 병렬 데이터 조회
     */
    async fetchResultData() {
      this.is_data_loading = true;
      this.is_data_error = false;
      this.result_list = [];

      try {
        const resultPromises = this.param.map(({ patient_id, request_date }) =>
          this.buildResultItem(patient_id, request_date)
        );

        const results = await Promise.all(resultPromises);
        this.result_list = results;
      } catch (error) {
        console.error('[결과 데이터 로드 오류]:', error);
        this.is_data_error = true;
        this.data_error_message = error.message || '데이터를 불러오는 중 오류가 발생했습니다.';
      } finally {
        this.is_data_loading = false;
      }
    },

    /**
     * 개별 환자의 기본정보, 요약통계, 유전자, 관련유전자 병렬 구성
     */
    async buildResultItem(patient_id, request_date) {
      const result_item = {
        patient_id: '',
        patient_name: '',
        gender: '',
        age: '',
        birth_date: '',
        request_date: '',
        collect_date: '',
        report_date: '',
        mobile: '',
        fit_yn: '',
        addr: '',
        request_path: '',
        summary: []
      };

      // 1. 기본정보 및 요약통계 병렬 조회
      const [baseInfo, summaryData] = await Promise.all([
        this.get_result_base_info(patient_id, request_date),
        this.get_result_summary(patient_id, request_date)
      ]);

      if (!baseInfo) {
        throw new Error(`환자(${patient_id}) 기본정보 조회 실패`);
      }
      if (!summaryData) {
        throw new Error(`환자(${patient_id}) 요약정보 조회 실패`);
      }

      this.setBaseInfo(result_item, baseInfo);
      this.setSummaryData(result_item, summaryData);

      // 2. 유전자 상세 및 관련 유전자 정보 병렬 조회
      await Promise.all([
        this.setGeneData(result_item, patient_id, request_date),
        this.setRelatedGeneData(result_item)
      ]);

      return result_item;
    },

    /**
     * 기본 인적사항 매핑
     */
    setBaseInfo(result_item, baseInfo) {
      result_item.patient_id = baseInfo.patient_id;
      result_item.patient_name = baseInfo.patient_name;
      result_item.gender = baseInfo.gender;
      result_item.age = baseInfo.age;
      result_item.birth_date = baseInfo.birth_date;
      result_item.request_date = this.to_date_string(baseInfo.request_date);
      result_item.collect_date = this.to_date_string(baseInfo.collect_date);
      result_item.report_date = this.to_date_string(baseInfo.report_date);
      result_item.mobile = baseInfo.mobile;
      result_item.fit_yn = baseInfo.fit_yn;
      result_item.addr = baseInfo.addr;
      result_item.request_path = baseInfo.request_path;
    },

    /**
     * 요약 통계 리스트 매핑 (성별 특화 탈모 항목 분기 포함)
     */
    setSummaryData(result_item, summaryData) {
      if (!Array.isArray(summaryData)) return;

      summaryData.forEach((element) => {
        // 여성인 경우 남성형 탈모 제외, 남성인 경우 여성형 탈모 제외
        if (
          (result_item.gender === 'F' && element.test_type_id === 'Hair loss') ||
          (result_item.gender === 'M' && element.test_type_id === 'Female-pattern hair loss')
        ) {
          return;
        }

        const summary_item = {
          type_id: element.type_id,
          type_name: element.type_name,
          test_type_id: element.test_type_id,
          test_type_name: element.test_type_name,
          result: element.result,
          my_risk_avg: element.my_risk_avg,
          gene: [],
          gene_info: []
        };
        result_item.summary.push(summary_item);
      });
    },

    /**
     * 대표 유전자(SNP) 정보 조회 및 매핑
     */
    async setGeneData(result_item, patient_id, request_date) {
      const genePromises = result_item.summary.map(async (summaryItem, index) => {
        const geneData = await this.get_result_gene(
          patient_id,
          request_date,
          summaryItem.test_type_id
        );

        if (!geneData) return;

        geneData.forEach((element) => {
          result_item.summary[index].gene.push({
            gene_cd: element.gene_cd,
            snp_cd: element.snp_cd,
            snp_type1: element.snp_type1,
            snp_type1_color: element.snp_type1_color,
            snp_type2: element.snp_type2,
            snp_type2_color: element.snp_type2_color,
            snp_type3: element.snp_type3,
            snp_type3_color: element.snp_type3_color,
            result_type: element.result_type,
            result_type_color: element.result_type_color
          });
        });
      });

      await Promise.all(genePromises);
    },

    /**
     * 관련 유전자 상세 정보(빈도, 인종 등) 조회 및 매핑
     */
    async setRelatedGeneData(result_item) {
      const relatedGenePromises = result_item.summary.map(async (summaryItem, index) => {
        const relatedGeneData = await this.get_result_related_gene(summaryItem.test_type_id);
        if (!relatedGeneData) return;

        relatedGeneData.forEach((element) => {
          const gene_info_item = {
            gene_cd: element.gene_cd,
            note: element.note,
            detail: []
          };

          let obj = null;
          if (Array.isArray(element.detail)) {
            for (let j = 0; j < element.detail.length; j++) {
              const detailItem = element.detail[j];
              if (!obj || obj.risk_type !== detailItem.risk_type || obj.normal_type !== detailItem.normal_type) {
                obj = {
                  risk_type: detailItem.risk_type,
                  normal_type: detailItem.normal_type
                };
                gene_info_item.detail.push(obj);
              }
              gene_info_item.detail.push({
                risk_rate: detailItem.risk_rate,
                normal_rate: detailItem.normal_rate,
                breed: detailItem.breed
              });
            }
          }
          result_item.summary[index].gene_info.push(gene_info_item);
        });
      });

      await Promise.all(relatedGenePromises);
    },

    /**
     * API 통신 공통 래퍼
     */
    async apiRequest(url, params = {}) {
      try {
        const res = await this.axios({
          method: 'get',
          url: `${this.$rootUrl}${url}`,
          headers: this.headers,
          params,
          responseType: 'json'
        });

        if (res.status === 200 && res.data && res.data.ret === '0000') {
          return res.data.info;
        }
        if (res.status === 200 && res.data && res.data.ret === '8888') {
          return [];
        }
        return null;
      } catch (err) {
        console.error(`[API 요청 실패] ${url}:`, err);
        return null;
      }
    },

    get_result_base_info(patient_id, request_date) {
      return this.apiRequest('/result/get_result_base_info.php', { patient_id, request_date });
    },

    get_result_summary(patient_id, request_date) {
      return this.apiRequest('/result/get_result_summary.php', { patient_id, request_date });
    },

    get_result_gene(patient_id, request_date, test_type_id) {
      return this.apiRequest('/result/get_result_gene.php', { patient_id, request_date, test_type_id });
    },

    get_result_related_gene(test_type_id) {
      const url = this.langCd === 'eng'
        ? '/result/get_result_related_gene.php?lang_cd=eng'
        : '/result/get_result_related_gene.php';
      return this.apiRequest(url, { test_type_id });
    },

    // ==========================================
    // 헬퍼 유틸리티 메서드
    // ==========================================

    to_date_string(date) {
      if (!date) return '';
      const split_str = date.split('-');
      if (split_str.length === 3) {
        return `${split_str[0]}년 ${split_str[1]}월 ${split_str[2]}일`;
      }
      return date;
    },

    get_level(result) {
      const levelMap = {
        '관리': 'lv3',
        '관심/주의': 'lv2',
        '관심ㆍ주의': 'lv2',
        '양호': 'lv1'
      };
      return levelMap[result] || '';
    },

    get_rowspan(detail) {
      if (!detail || detail.length === 0) return 1;
      return detail.length;
    },

    getItem(result, testTypeId) {
      if (!result || !result.summary) return {};
      let item = result.summary.find((s) => s.test_type_id === testTypeId);
      if (!item && (testTypeId === 'Lutein & Zeaxanthin levels' || testTypeId === 'Lutein levels')) {
        item = result.summary.find((s) => s.test_type_id === 'Lutein levels' || s.test_type_id === 'Lutein & Zeaxanthin levels');
      }
      if (!item && (testTypeId === 'Uric acid levels' || testTypeId === 'Uric acid')) {
        item = result.summary.find((s) => s.test_type_id === 'Uric acid levels' || s.test_type_id === 'Uric acid');
      }
      return item || {};
    },

    hasItem(result, testTypeId) {
      const item = this.getItem(result, testTypeId);
      return Boolean(item && item.test_type_id);
    },

    hasCategory(result, categoryId) {
      if (!result || !result.summary) return false;
      const catLower = (categoryId || '').toLowerCase();
      return result.summary.some((i) => {
        const typeId = (i.type_id || '').toLowerCase();
        if (catLower === 'beauty' || catLower === 'skin') {
          return typeId === 'beauty' || typeId === 'skin' || typeId === 'hair';
        }
        return typeId === catLower;
      });
    },

    updatePagination() {
      const rootEl = this.$el;
      if (!rootEl || !rootEl.querySelectorAll) return;
      const containers = rootEl.querySelectorAll('.patient-report-item');
      containers.forEach((container) => {
        const pages = container.querySelectorAll('.page');
        const totalPages = pages.length;

        pages.forEach((page, idx) => {
          const existing = page.querySelector('.report-page-number');
          if (existing) existing.remove();

          if (page.className && page.className.includes('cover')) return;

          const el = document.createElement('div');
          el.className = 'report-page-number';
          el.textContent = `${idx + 1}/${totalPages}`;
          page.appendChild(el);
        });
      });
    }
  }
};
