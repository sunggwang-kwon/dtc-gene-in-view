<template>
  <table>
    <colgroup>
      <col width="20%">
      <col width="30%">
      <col width="22%">
      <col width="*">
    </colgroup>
    <thead>
      <tr>
        <th>유전자</th>
        <th>단일유전자변이(SNP)</th>
        <th>대립유전자형</th>
        <th>검사대상자 결과</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(gene_item, index) in data" :key="(uuid || '') + index">
        <td>{{ gene_item.gene_cd }}</td>
        <td>{{ gene_item.snp_cd }}</td>
        <td>
          <em v-if="gene_item.snp_type1_color === 'blue'" :class="gene_item.snp_type1_color">{{ gene_item.snp_type1 }}</em>
          <em v-else-if="gene_item.snp_type2_color === 'blue'" :class="gene_item.snp_type2_color">{{ gene_item.snp_type2 }}</em>
          <em v-else-if="gene_item.snp_type3_color === 'blue'" :class="gene_item.snp_type3_color">{{ gene_item.snp_type3 }}</em>

          <em v-if="gene_item.snp_type1_color === 'orange' || gene_item.snp_type1_color === 'org'" :class="gene_item.snp_type1_color">{{ gene_item.snp_type1 }}</em>
          <em v-else-if="gene_item.snp_type2_color === 'orange' || gene_item.snp_type2_color === 'org'" :class="gene_item.snp_type2_color">{{ gene_item.snp_type2 }}</em>
          <em v-else-if="gene_item.snp_type3_color === 'orange' || gene_item.snp_type3_color === 'org'" :class="gene_item.snp_type3_color">{{ gene_item.snp_type3 }}</em>

          <em v-if="gene_item.snp_type1_color === 'red'" :class="gene_item.snp_type1_color">{{ gene_item.snp_type1 }}</em>
          <em v-else-if="gene_item.snp_type2_color === 'red'" :class="gene_item.snp_type2_color">{{ gene_item.snp_type2 }}</em>
          <em v-else-if="gene_item.snp_type3_color === 'red'" :class="gene_item.snp_type3_color">{{ gene_item.snp_type3 }}</em>
        </td>
        <td>
          <b :class="gene_item.result_type_color">{{ gene_item.result_type }}</b>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script>
export default {
  name: 'RepresentativeGene',
  props: {
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
