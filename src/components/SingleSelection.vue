<template>
  <div>
    <div v-for="(description, i) in descriptions" :key="description">
      <label>
        <input type="radio" :checked="i === value" :input="$emit('input', i)" />
        {{ description }}
      </label>
    </div>
  </div>
</template>
<script lang="ts">
import Vue from 'vue'
export default Vue.extend({
  props: {
    descriptions: Array as () => string[],
    value: Number
  }
})
</script>