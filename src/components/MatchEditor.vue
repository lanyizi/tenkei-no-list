<template>
  <div class="match-editor">
    <div v-if="!winnerEditable">
      {{ $t('matchEdit.cannotEdit') }}
      {{ $t('matchEdit.hintCannotEdit') }}
    </div>
    <table class="match-editor-fields">
      <thead>
        <td>{{ $t('bracket.playerName') }}</td>
        <td>{{ $t('bracket.score') }}</td>
        <td>{{ $t('bracket.winner') }}</td>
      </thead>
      <tr v-for="(row, i) in value" :key="i">
        <td>
          <input type="text" :value="row.name" @input="editWinner(i, $event.target.value)" />
        </td>
        <td>
          <input
            type="number"
            step="1"
            :value="row.score"
            v-on:input="editScore(i, $event.target.value)"
          />
        </td>
        <td>
          <input
            type="checkbox"
            :disabled="!winnerEditable"
            :value="row.isWinner"
            v-on:input="editName(i, $event.target.checked)"
          />
        </td>
      </tr>
      <tr></tr>
    </table>
    <button v-on:click="$emit('match-edit-confirmed')">{{ $t('generic.submit') }}</button>
    <button v-on:click="$emit('match-edit-cancelled')">{{ $t('generic.cancel') }}</button>
  </div>
</template>
<script lang="ts">
import Vue from "vue";
import { PlayerVM } from "./Match.vue";

export default Vue.extend({
  props: {
    bestOf: Number,
    winnerEditable: Boolean,
    value: Array as () => PlayerVM[],
  },
  methods: {
    editName(index: number, newName: string) {
      this.emitInput(index, { name: newName });
    },
    editScore(index: number, newScore: number) {
      this.emitInput(index, { score: newScore });
      if (!this.winnerEditable) {
        return;
      }
      const other = this.value[1 - index].score || 0;
      const matchPoint = this.bestOf / 2;
      if (newScore > matchPoint) {
        this.editWinner(index, true);
      } else if (other > matchPoint) {
        this.editWinner(1 - index, true);
      }
    },
    editWinner(index: number, isWinner: boolean) {
      if (isWinner) {
        this.emitInput(1 - index, { isWinner: false });
      }
      this.emitInput(index, { isWinner });
    },
    emitInput(index: number, modified: Partial<PlayerVM>) {
      const copy = this.value.slice();
      copy[index] = { ...copy[index], ...modified };
      this.$emit("input", copy);
    },
  },
});
</script>