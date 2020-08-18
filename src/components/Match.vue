<template>
  <div class="lanyi-match">
    <div class="lanyi-match-players">
      <v-row class="lanyi-match-player" v-for="(p, i) in players" :key="i">
        <v-col
          cols="10"
          class="lanyi-match-player-name px-2 py-0 ma-0 d-flex align-center"
          :class="{ 'match-player-hint': p.id == null }"
        >{{ p.name }}</v-col>
        <v-col
          cols="2"
          class="lanyi-match-player-score pa-0 ma-0 d-flex justify-center align-center"
          :class="{ 'lanyi-match-player-winner': p.isWinner }"
        >{{ p.score }}</v-col>
      </v-row>
    </div>
    <div class="lanyi-match-id d-flex justify-center align-center">#{{ value.id }}</div>
  </div>
</template>
<script lang="ts">
import Vue from "vue";
import { Tournament } from "@/models/tournament";

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

export const matchToVM = (
  model: Tournament,
  matchId: number,
  translator: Vue["$t"]
): MatchVM => {
  const match = model.matches[matchId];
  const origins = model.origins[matchId]?.filter(
    (m) => model.matches[m].winner === null
  );
  // get hint of who might come to this match.
  // useful for losers' bracket
  const maybeHint = (from?: number) => {
    if (from === undefined) {
      return "";
    }
    if (model.matches[from].loserNext === matchId) {
      return `${translator("bracket.loserOf", { from })}`;
    }
    return "";
  };
  const playerToVM = (id: number | null, score: number | null): PlayerVM => ({
    id,
    name: id !== null ? model.players[id] : maybeHint(origins?.pop()),
    score,
    isWinner: id !== null && id === match.winner,
  });
  return {
    id: matchId,
    p1: playerToVM(match.p1, match.p1Score),
    p2: playerToVM(match.p2, match.p2Score),
    next: match.winnerNext,
  };
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
<style scoped>
.lanyi-match * {
  border: none;
  margin: 0;
  border-spacing: 0;
  border-collapse: collapse;
}

[class^="lanyi-match-"] {
  box-shadow: inset 1px 1px black, inset -1px -1px black;
  color: white;
  font-weight: bold;
}

.lanyi-match {
  width: 250px;
  height: 60px;
  box-shadow: inset 1.5px 1.5px black, inset -1.5px -1.5px black;
  position: relative;
}

.lanyi-match-players {
  width: 82.5%;
  height: 100%;
  float: left;
}

.lanyi-match-player {
  position: relative;
  width: 100%;
  height: 50%;
}

.lanyi-match-player-name {
  overflow: hidden;
  white-space: nowrap;
  background: rgba(0, 0, 0, 0.6);
}

.lanyi-match-player-score {
  background: rgba(192, 192, 192, 0.5);
  color: black;
}

.lanyi-match-player-score.lanyi-match-player-winner {
  background: white;
}

.lanyi-match-id {
  width: 17.5%;
  height: 100%;
  float: right;
  background: rgba(96, 96, 96, 0.5);
}
</style>