<template>
  <table>
    <colgroup>
      <col width="18%">
      <col width="39%">
      <col width="11.5%">
      <col width="11.5%">
      <col width="*">
    </colgroup>
    <thead>
      <tr>
        <th>유전자</th>
        <th>역할</th>
        <th colspan="2">빈도</th>
        <th>인종</th>
      </tr>
    </thead>
    <tbody>
      <template v-for="(info, index) in data">
        <tr :key="(uuid || '') + 'head' + index">
          <td :rowspan="get_rowspan(info.detail)">{{ info.gene_cd }}</td>
          <td :rowspan="get_rowspan(info.detail)" class="text">{{ info.note }}</td>
          <td><b>{{ (info.detail && info.detail[0]) ? info.detail[0].normal_type : '' }}</b></td>
          <td><b>{{ (info.detail && info.detail[0]) ? info.detail[0].risk_type : '' }}</b></td>
          <td></td>
        </tr>
        <tr v-for="(detail, index2) in (info.detail || []).slice(1)" :key="(uuid || '') + 'row' + index + '-' + index2">
          <td v-if="!detail.risk_type && !detail.normal_type">{{ detail.normal_rate }}%</td>
          <td v-else><b>{{ detail.normal_type }}</b></td>

          <td v-if="!detail.risk_type && !detail.normal_type">{{ detail.risk_rate }}%</td>
          <td v-else><b>{{ detail.risk_type }}</b></td>

          <td v-if="!detail.risk_type && !detail.normal_type">{{ detail.breed }}</td>
          <td v-else></td>
        </tr>
      </template>
    </tbody>
  </table>
</template>

<script>
export default {
  name: 'RelatedGene2',
  props: {
    data: {
      type: Array,
      default: () => []
    },
    uuid: {
      type: String,
      default: ''
    }
  },
  methods: {
    get_rowspan(detail) {
      if (!detail || detail.length === 0) return 1;
      return detail.length;
    }
  }
}
</script>
