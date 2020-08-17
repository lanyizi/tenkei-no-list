<template>
  <div class="brackets">
    <table>
      <tr v-for="(row, j) in winnersBracket" :key="j">
        <td v-for="(element, i) in row" in table :key="i" class="match-cell">
          <Match v-if="element != null" :value="element" @click.native="onMatchClick(element.id)"></Match>
          <MatchEditor
            v-if="element != null && element.id === matchEditorId"
            :best-of="3"
            :winner-editable="winnerEditable"
            :token="token"
            :tournament-id="tournamentId"
            :match-id="element.id"
            :original="[element.p1, element.p2]"
            @refresh-requested="$emit('refresh-requested')"
            @close="matchEditorId = null"
          ></MatchEditor>
        </td>
      </tr>
    </table>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import Match, { MatchVM, PlayerVM } from "./Match.vue";
import MatchEditor from "./MatchEditor.vue";
import {
  Tournament,
  isDoubleElimination,
  isSingleElimination,
} from "@/models/tournament";
import { nCopies } from "@/utils";

type ElementVM = MatchVM | null;

export default Vue.extend({
  components: {
    Match,
    MatchEditor,
  },
  data: () => ({
    matchEditorId: null as number | null,
  }),
  props: {
    tournamentId: Number,
    model: Object as () => Tournament,
    token: String,
  },
  methods: {
    onMatchClick(id: number) {
      if (this.matchEditorId !== null) {
        return;
      }
      this.matchEditorId = id;
    },
    matchToVM(matchId: number): MatchVM {
      const match = this.model.matches[matchId];
      // who might come to this match
      const origins = this.model.origins[matchId]?.filter(
        (m) => this.model.matches[m].winner === null
      );
      // get hint of who might come to this match.
      // useful for losers' bracket
      const maybeHint = (from?: number) => {
        if (from === undefined) {
          return "";
        }
        if (this.model.matches[from].loserNext === matchId) {
          return `${this.$t("bracket.loserOf", { from })}`;
        }
        return "";
      };
      const playerToVM = (
        id: number | null,
        score: number | null
      ): PlayerVM => ({
        id,
        name: id !== null ? this.model.players[id] : maybeHint(origins?.pop()),
        score,
        isWinner: id !== null && id === match.winner,
      });
      return {
        id: matchId,
        p1: playerToVM(match.p1, match.p1Score),
        p2: playerToVM(match.p2, match.p2Score),
        next: match.winnerNext,
      };
    },
    roundsToTable(rounds: number[][]) {
      if (rounds.length === 0) {
        throw Error("empty rounds");
      }

      const rows = (1 << rounds.length) - 1;
      const matrix: ElementVM[][] = nCopies(rows, () =>
        nCopies(rounds.length, () => null)
      );

      const assign = (r: number, m: number, begin: number, end: number) => {
        const current = begin + (end - 1 - begin) / 2;
        const matchId = rounds[r][m];
        matrix[current][r] = this.matchToVM(rounds[r][m]);
        if (r == 0) {
          return;
        }
        const previousIndices = rounds[r - 1]
          .map((n, i) => [n, i])
          .filter(([n]) => this.model.matches[n].winnerNext == matchId)
          .map(([, i]) => i);

        if (previousIndices.length > 0) {
          assign(r - 1, previousIndices[0], begin, current);
        }
        if (previousIndices.length > 1) {
          assign(r - 1, previousIndices[1], current + 1, end);
        }
      };

      assign(rounds.length - 1, 0, 0, rows);
      return matrix.filter((row) => row.some((element) => element !== null));
    },
  },
  computed: {
    winnersBracket(): ElementVM[][] {
      if (isDoubleElimination(this.model)) {
        const winners = this.model.winnersRounds;
        const rounds = winners.slice(0, winners.length - 1);

        const finalsVM = this.matchToVM(winners.slice(-1)[0][0]);
        const table = this.roundsToTable(rounds);
        const finalsRow = table.findIndex((row) => row.slice(-1)[0] !== null);

        table.forEach((row, i) => {
          const extraColumns = [i == finalsRow ? finalsVM : null];
          if (finalsVM.next !== null) {
            const element =
              i == finalsRow ? this.matchToVM(finalsVM.next) : null;
            extraColumns.push(element);
          }
          row.push(...extraColumns);
        });

        return table;
      } else if (isSingleElimination(this.model)) {
        return this.roundsToTable(this.model.winnersRounds);
      }
      return [];
    },
    // can the currently selected match's winner be changed?
    winnerEditable(): boolean {
      if (this.matchEditorId === null) {
        return false;
      }
      const matches = this.model.matches;
      const match = matches[this.matchEditorId];
      const nexts = [match.winnerNext, match.loserNext];
      if (nexts.some((x) => x !== null && matches[x].winner !== null)) {
        // some of next match finished, this match cannot be edited
        return false;
      }
      return true;
    },
  },
});
</script>
<style scoped>
.match-cell {
  width: 200px;
  height: 50px;
}
</style>
