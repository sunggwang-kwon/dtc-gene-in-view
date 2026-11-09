<template>
  <table>
    <colgroup>
      <col width="23%">
      <col width="30%">
      <col width="10%">
      <col width="10%">
      <col width="*">
    </colgroup>
    <thead>
      <tr>
        <th rowspan="2">유전자</th>
        <th rowspan="2">단일유전자변이(SNP)</th>
        <th colspan="2">대립유전자형</th>
        <th rowspan="2">검사대상자 결과</th>
      </tr>
      <tr>
        <th><em v-if="longshort">롱</em><em v-else>증가</em></th>
        <th><em v-if="longshort">쇼트</em><em v-else>감소</em></th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(gene_item, index) in data" :key="(uuid || '') + index">
        <td>{{ gene_item.gene_cd }}</td>
        <td>{{ gene_item.snp_cd }}</td>
        <td colspan="2">
          <em>{{ gene_item.snp_type1 }}</em>
          <em>{{ gene_item.snp_type2 }}</em>
          <em>{{ gene_item.snp_type3 }}</em>
        </td>
        <td>
          <b>{{ gene_item.result_type }}</b>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script>
export default {
  name: 'RepresentativeGene2',
  props: {
    longshort: {
      type: Boolean,
      default: false
    },
    data: {
      type: Array,
      default: () => []
    },
    uuid: {
      type: String,
      default: ''
    }
  }
}
</script>
