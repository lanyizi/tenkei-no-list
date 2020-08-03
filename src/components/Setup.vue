<template>
  <div>
    <table class="player-list">

    </table>
    <single-selection
      :descriptions="[$t('singleElimination'), $t('doubleElimination')]"
    >
    </single-selection>
  </div>
</template>
<script lang="ts">
import Vue from 'vue'
import SingleSelection from "./SingleSelection.vue";
export default Vue.extend({
  components: {
    SingleSelection
  }
})
</script>