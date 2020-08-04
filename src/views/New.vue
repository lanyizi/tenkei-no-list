<template>
  <SetupComponent :referee-names="['miao', 'mie']" v-model="setup"/>
</template>
<script lang="ts">
import Vue from 'vue'
import SetupComponent from '@/components/Setup.vue'
import { Setup } from "@/models/setup";
export default Vue.extend({
  components: { SetupComponent },
  props: {
    user: Number
  },
  data() {
    return {
      setup: new Setup(this.user || 0)
    }
  }

})
</script>