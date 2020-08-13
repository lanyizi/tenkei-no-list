<template>
  <table class="match">
    <tr class="match-player" v-for="(p, i) in players" :key="i">
      <td class="match-player-name" :class="{ 'match-player-hint': p.id == null }">{{ p.name }}</td>
      <td v-if="p.id != null" :class="{ 'match-player-winner': p.isWinner }">{{ p.score }}</td>
    </tr>
  </table>
</template>
<script lang="ts">
import Vue from "vue";

export type PlayerVM = {
  id: number | null;
  name: string;
  score: number | null;
  isWinner: boolean;
};

export type MatchVM = {
  id: number;
  p1: PlayerVM;
  p2: PlayerVM;
  next: number | null;
};

export default Vue.extend({
  props: {
    value: Object as () => MatchVM,
  },
  methods: {
    setScore(index: number, score: number) {
      if (index !== 0 && index !== 1) {
        throw Error("invalid argument");
      }
      const field = index === 0 ? "p1" : "p2";
      const updated = { ...this.value[field], score };
      this.$emit("input", { ...this.value, [field]: updated });
    },
  },
  computed: {
    players(): PlayerVM[] {
      return [this.value.p1, this.value.p2];
    },
  },
});
</script>