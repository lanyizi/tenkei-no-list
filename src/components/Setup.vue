<template>
  <div>
    <table class="player-list">

    </table>
    <single-selection
      :descriptions="[$t('generic.singleElimination'), $t('generic.doubleElimination')]"
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
  },
})
</script>