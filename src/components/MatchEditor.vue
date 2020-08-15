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
      <tr v-for="(row, i) in merged" :key="i">
        <td>
          <input type="text" :value="row.name" @input="editName(i, $event.target.value)" />
        </td>
        <td>
          <input
            type="number"
            step="1"
            :value="row.score"
            v-on:input="editScore(i, parseInt($event.target.value))"
          />
        </td>
        <td>
          <input
            type="checkbox"
            :disabled="!winnerEditable"
            :checked="row.isWinner"
            v-on:input="editWinner(i, $event.target.checked)"
          />
        </td>
      </tr>
      <tr></tr>
    </table>
    <button :disabled="!hasEdits" @click="applyEdits">{{ $t('generic.submit') }}</button>
    <button @click="emitClose">{{ $t('generic.cancel') }}</button>
  </div>
</template>
<script lang="ts">
import Vue from "vue";
import { PlayerVM } from "./Match.vue";
import { PlayerNameEdit, ScoreEdit, WinnerEdit } from "@/models/changes";
import isEqual from "lodash/isEqual";
import { notNull } from "@/utils";
import { request } from "@/request";

const createEditModel = (): {
  p1: PlayerNameEdit | null;
  p2: PlayerNameEdit | null;
  scores: ScoreEdit | null;
  winner: WinnerEdit | null;
} => ({
  p1: null,
  p2: null,
  scores: null,
  winner: null,
});
const keys = ["p1", "p2", "scores", "winner"] as const;

export default Vue.extend({
  data: () => ({
    edited: createEditModel(),
  }),
  props: {
    bestOf: Number,
    winnerEditable: Boolean,
    token: String,
    tournamentId: String,
    matchId: Number,
    original: Array as () => PlayerVM[],
  },
  watch: {
    original: {
      immediate: true,
      deep: true,
      handler(value, old) {
        if (!isEqual(value, old)) {
          this.edited = createEditModel();
        }
      },
    },
  },
  computed: {
    merged(): PlayerVM[] {
      const copy = this.original.map((x) => ({ ...x }));
      [copy[0].name, copy[1].name] = [this.edited.p1, this.edited.p2].map(
        (p, i) => p?.edited ?? copy[i].name
      );
      if (this.edited.scores) {
        [copy[0].score, copy[1].score] = this.edited.scores.edited;
      }
      if (this.edited.winner) {
        for (const p of copy) {
          p.isWinner = p.id != null && p.id === this.edited.winner.edited;
        }
      }
      return copy;
    },
    hasEdits(): boolean {
      return keys.some((k) => notNull(this.edited[k]));
    },
  },
  methods: {
    editName(index: number, edited: string) {
      const { id, name } = this.original[index];
      if (id == null) {
        return;
      }
      const keys = ["p1", "p2"] as const;
      if (name === edited) {
        this.edited[keys[index]] = null;
        return;
      }
      this.edited[keys[index]] = {
        type: "nameEdit",
        playerId: id,
        previous: name,
        edited,
      };
    },
    editScore(index: number, score: number) {
      if (!this.edited.scores) {
        const current = this.original.map((p) => p.score);
        this.edited.scores = {
          type: "scoreEdit",
          matchId: this.matchId,
          previous: current,
          edited: current.slice(),
        };
      }

      const editing = this.edited.scores.edited;
      editing[index] = score;
      // assign score to opponent too, if it's still null
      const other = editing[1 - index] ?? 0;
      editing[1 - index] = other;

      if (isEqual(editing, this.edited.scores.previous)) {
        this.edited.scores = null;
        return;
      }
      if (!this.winnerEditable) {
        return;
      }
      // automatically assign winner by the score
      const matchPoint = this.bestOf / 2;
      if (score > matchPoint && score > other) {
        this.editWinner(index, true);
      } else if (other > matchPoint && other > score) {
        this.editWinner(1 - index, true);
      }
    },
    editWinner(index: number, isWinner: boolean) {
      if (!this.edited.winner) {
        const current = this.original.find((p) => p.isWinner)?.id ?? null;
        this.edited.winner = this.edited.winner ?? {
          type: "winnerEdit",
          matchId: this.matchId,
          previous: current,
          edited: current,
        };
      }

      if (isWinner) {
        this.edited.winner.edited = this.original[index].id;
      } else if (this.edited.winner.edited === this.original[index].id) {
        this.edited.winner.edited = null;
      }

      if (this.edited.winner.previous === this.edited.winner.edited) {
        this.edited.winner = null;
        return;
      }
    },
    async applyEdits() {
      try {
        const promises = keys
          .map((k) => this.edited[k])
          .filter(notNull)
          .map((e) => {
            return request("POST", "/changes", this.token, {
              tournament: parseInt(this.tournamentId),
              ...e,
            });
          });
        await Promise.all(promises);
        this.$emit("refresh-requested");
        this.emitClose();
      } catch (error) {
        alert(error);
      }
    },
    emitClose() {
      this.$emit("close");
    },
  },
});
</script>