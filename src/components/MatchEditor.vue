<template>
  <v-card class="lanyi-match-editor">
    <v-card-title class="headline grey lighten-2">{{ $t('matchEdit.title') }}</v-card-title>
    <v-card-text>
      <div v-if="!winnerEditable">
        {{ $t('matchEdit.cannotEdit') }}
        {{ $t('matchEdit.hintCannotEdit') }}
      </div>
      <v-simple-table>
        <thead>
          <tr>
            <td>{{ $t('bracket.playerName') }}</td>
            <td>{{ $t('bracket.score') }}</td>
            <td>{{ $t('bracket.winner') }}</td>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in merged" :key="i">
            <td>
              <v-text-field :value="row.name" @input="editName(i, $event)" />
            </td>
            <td>
              <v-text-field
                type="number"
                class="lanyi-score-input"
                step="1"
                :value="row.score"
                v-on:input="editScore(i, parseInt($event))"
              />
            </td>
            <td>
              <v-checkbox
                :disabled="!winnerEditable"
                :input-value="row.isWinner"
                @change="editWinner(i, $event)"
              />
            </td>
          </tr>
        </tbody>
      </v-simple-table>
      <v-card-actions>
        <v-btn color="success" :disabled="!hasEdits" @click="applyEdits">{{ $t('generic.submit') }}</v-btn>
        <v-spacer />
        <v-btn color="info" @click="emitClose">{{ $t('generic.cancel') }}</v-btn>
      </v-card-actions>
    </v-card-text>
  </v-card>
</template>
<script lang="ts">
import Vue from "vue";
import { PlayerVM, matchToVM } from "./Match.vue";
import { PlayerNameEdit, ScoreEdit, WinnerEdit } from "@/models/changes";
import isEqual from "lodash/isEqual";
import { notNull } from "@/utils";
import { request } from "@/request";
import {
  Tournament,
  isDoubleElimination,
  getKeyInNext,
} from "@/models/tournament";
import { WithID } from "@/models/validations";

const createEditModel = (): {
  p1: PlayerNameEdit | null;
  p2: PlayerNameEdit | null;
  scores: ScoreEdit | null;
  winner: WinnerEdit | null;
  // special edit for double elimination finals:
  // No extra match: ScoreEdit - Winner has one point advantage
  // With extra match - If winner is from winner's brakcet, winner auto wins
  // the extra match
  deFinals: ScoreEdit | WinnerEdit | null;
} => ({
  p1: null,
  p2: null,
  scores: null,
  winner: null,
  deFinals: null,
});
const keys = ["p1", "p2", "scores", "winner", "deFinals"] as const;

export default Vue.extend({
  data: () => ({
    edited: createEditModel(),
  }),
  props: {
    bestOf: Number,
    token: String,
    tournament: Object as () => WithID<Tournament>,
    matchId: Number,
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
    original(): PlayerVM[] {
      const { p1, p2 } = matchToVM(this.tournament, this.matchId, this.$i18n);
      return [p1, p2];
    },
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
    // can the this match's winner be changed?
    winnerEditable(): boolean {
      const matches = this.tournament.matches;
      const match = matches[this.matchId];
      const nexts = [match.winnerNext, match.loserNext];
      if (nexts.some((x) => x !== null && matches[x].winner !== null)) {
        // some of next match finished, this match cannot be edited
        return false;
      }
      return true;
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
      // reset deFinals
      this.edited.deFinals = null;

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

      // handle finals of double elimination
      if (isDoubleElimination(this.tournament)) {
        if (this.edited.winner.edited === null) {
          // do not create this.edited.deFinals if winner is null
          return;
        }
        const [
          [semiFinalsId],
          [finalsId],
        ] = this.tournament.winnersRounds.slice(-2);
        const finals = this.tournament.matches[finalsId];
        const semiFinals = this.tournament.matches[semiFinalsId];
        if (finals.winnerNext !== null) {
          // has extra match
          // check if the current winner being set is from final match
          if (this.matchId !== finalsId) {
            return;
          }

          // check if winner comes from the winner bracket
          if (semiFinals.winner === this.edited.winner.edited) {
            // if winner's bracket winner has won the finals, then extra match
            // doesn't have to be played, the winner auto wins the extra match
            this.edited.deFinals = {
              type: "winnerEdit",
              matchId: finals.winnerNext,
              previous: this.tournament.matches[finals.winnerNext].winner,
              edited: this.edited.winner.edited,
            };
          }
        } else {
          const loserFinalsIds: number[] = [];
          if (this.tournament.losersRounds.length > 1) {
            loserFinalsIds.push(...this.tournament.losersRounds.slice(-1)[0]);
          }
          // no extra match, winner bracket winner has 1 point advantage
          // check if the current winner being set is from semifinals
          if (![semiFinalsId, ...loserFinalsIds].includes(this.matchId)) {
            return;
          }
          // if yes, next match will have one point advantage for the winner.
          // try to predict the winner's key:
          const key = getKeyInNext(
            this.tournament,
            semiFinalsId,
            finalsId,
            true
          );
          const index = key === "p1" ? 0 : 1;
          const previous = [finals.p1Score, finals.p2Score];
          const edited = previous.slice();
          // assign the one point advantage
          edited[index] = edited[index] || 1;
          if (isEqual(previous, edited)) {
            // if the point advantage is already assigned, then do not edit
            return;
          }
          this.edited.deFinals = {
            type: "scoreEdit",
            matchId: finalsId,
            previous,
            edited,
          };
        }
      }
    },
    async applyEdits() {
      try {
        const promises = keys
          .map((k) => this.edited[k])
          .filter(notNull)
          .map((e) => {
            return request("POST", "/changes", this.token, {
              tournament: this.tournament.id,
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
<style scoped>
.lanyi-score-input {
  max-width: 3em;
  max-width: 5ch;
}
</style>