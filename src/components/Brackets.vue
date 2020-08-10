<template>
  <div class="brackets">
    <table>
      <tr v-for="(row, j) in winnersBracket" :key="j">
        <td v-for="(element, i) in row" in table :key="i">
          <Match v-if="element != null" :value="element" @click="onMatchClick(element.id)"></Match>
          <MatchEditor
            v-if="element != null && element.id === matchEditorId"
            :best-of="3"
            :winner-editable="winnerEditable"
            v-model="currentEdit"
            @match-edit-confirmed="onMatchEditConfimed"
            @match-edit-cancelled="matchEditorId = null"
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
  SingleElimination,
  DoubleElimination,
} from "@/models/tournament";
import { nCopies, notNull } from "@/utils";

type ElementVM = MatchVM | null;

export type MatchEditResult = {
  editedPlayers: { id: number; newName: string }[];
  matchId: number;
  editedScores: { playerIndex: number; newScore: number | null }[];
} & (
  | {
      editedWinner: undefined;
    }
  | {
      editedWinner: number | null;
      playersInNextMatches: { matchId: number; playerIndex: number }[];
    }
);

export default Vue.extend({
  components: {
    Match,
    MatchEditor,
  },
  data: () => ({
    matchEditorId: null as number | null,
    currentEdit: [{}, {}] as PlayerVM[],
  }),
  props: {
    model: Object as () => Tournament,
  },
  methods: {
    onMatchClick(id: number) {
      if (this.matchEditorId !== null) {
        return;
      }
      this.matchEditorId = id;
      const { p1, p2 } = this.matchToVM(this.matchEditorId);
      this.currentEdit = [p1, p2];
    },
    onMatchEditConfimed() {
      if (this.matchEditorId === null) {
        throw new Error("unexpected edit");
      }

      const editing = this.model.matches[this.matchEditorId];

      // check winners
      const winner =
        [editing.p1, editing.p2].filter((p, i) => {
          return this.currentEdit[i].isWinner;
        })[0] || null;
      // if winner has changed in the currrent match, return information of
      // next matches which need to have their players being resetted
      const getPlayersInNextMatches = (nextId: number | null) => {
        if (nextId === null) {
          return null;
        }
        const next = this.model.matches[nextId];
        const playerFields = ["p1", "p2"] as const;
        const playerIndex = playerFields.findIndex((p) =>
          playerFields.some((q) => editing[q] === next[p])
        );
        return playerIndex !== -1 ? { matchId: nextId, playerIndex } : null;
      };

      const result: MatchEditResult = {
        matchId: this.matchEditorId,
        editedPlayers: [editing.p1, editing.p2]
          .filter(notNull)
          .map((p, i) => ({ id: p, newName: this.currentEdit[i].name }))
          .filter(({ id, newName }) => {
            this.model.players[id] !== newName;
          }),
        editedScores: (["p1Score", "p2Score"] as const)
          .map((field, i) => ({
            playerIndex: i,
            oldScore: editing[field],
            newScore: this.currentEdit[i].score,
          }))
          .filter(({ oldScore, newScore }) => oldScore !== newScore),
        editedWinner: winner === editing.winner ? undefined : winner,
        playersInNextMatches: [editing.winnerNext, editing.loserNext]
          .map(getPlayersInNextMatches)
          .filter(notNull),
      };

      this.matchEditorId = null;
      this.$emit("match-edited", result);
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
        const fromMatch = this.model.matches[from];
        return `${fromMatch.p1}或${fromMatch.p2}`;
      };
      const playerToVM = (
        id: number | null,
        score: number | null
      ): PlayerVM => ({
        name: id !== null ? this.model.players[id] : maybeHint(origins?.pop()),
        score,
        isPlaceHolder: id === null,
        isWinner: id === match.winner,
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
      if (DoubleElimination.isDoubleElimination(this.model)) {
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
      } else if (SingleElimination.isSingleElimination(this.model)) {
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

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
td {
  border: 1px solid black;
}
h3 {
  margin: 40px 0 0;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}
</style>
