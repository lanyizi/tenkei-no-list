<template>
  <div class="brackets">
    <v-dialog
      max-width="600"
      :value="matchEditorId != null"
      @input="matchEditorId = $event ? matchEditorId : null"
    >
      <MatchEditor
        v-if="matchEditorId != null"
        :best-of="3"
        :token="token"
        :tournament="model"
        :match-id="matchEditorId"
        @refresh-requested="$emit('refresh-requested')"
        @close="matchEditorId = null"
      ></MatchEditor>
    </v-dialog>
    <table>
      <tr>
        <th v-for="(r, i) in winnersRounds" :key="i">{{ r }}</th>
      </tr>
      <tr v-for="{row, rowKey} in winnersBracket" :key="rowKey">
        <td v-for="(element, i) in row" :key="element ? element.id : `~${i}`" class="match-cell">
          <Match
            v-if="element != null"
            :id="getMatchElementId(element.id)"
            :value="element"
            @click.native="onMatchClick(element.id)"
          ></Match>
        </td>
      </tr>
    </table>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import Match, { MatchVM, matchToVM } from "./Match.vue";
import MatchEditor from "./MatchEditor.vue";
import {
  Tournament,
  isDoubleElimination,
  isSingleElimination,
} from "@/models/tournament";
import { nCopies, notNull } from "@/utils";
import jsPlumb, { jsPlumbInstance } from "jsplumb";
import { WithID } from "@/models/validations";

type ElementVM = MatchVM | null;

const getRowWithKey = (row: ElementVM[], j: number) => {
  // create a unique id for each row based on the row content
  // so two rows with same index and with exactly same content will have the
  // same id.
  // Useful for v-for :key
  return {
    row,
    rowKey: j + row.map((x) => (x ? `m${x.id}` : `~`)).join(""),
  };
};
type Table = ReturnType<typeof getRowWithKey>[];

let id = 0;

class Connectors {
  _elementSet?: true;
  _jsPlumb?: jsPlumbInstance;

  setContainer(el: Element) {
    if (this._elementSet) {
      throw Error("Id already set");
    }
    this._elementSet = true;
    const instance = jsPlumb.jsPlumb.getInstance({
      Anchors: ["Right", "Left"],
      ConnectionsDetachable: false,
      Connector: "Flowchart",
      Endpoint: "Blank",
      PaintStyle: { stroke: "black", strokeWidth: 2 },
    });
    return new Promise<void>((resolve) => {
      instance.ready(() => {
        instance.setContainer(el);
        this._jsPlumb = instance;
        resolve();
      });
    });
  }

  connect(params: jsPlumb.ConnectParams) {
    if (!this._jsPlumb) {
      throw Error("JsPlumb not ready");
    }
    this._jsPlumb.connect(params);
  }

  reset() {
    this._jsPlumb?.reset();
  }
}

export default Vue.extend({
  components: {
    Match,
    MatchEditor,
  },
  data: () => ({
    bracketId: `lanyi-brackets-${++id}`,
    connectors: new Connectors(),
    matchEditorId: null as number | null,
    openEditor: false,
  }),
  props: {
    model: Object as () => WithID<Tournament>,
    token: String,
  },
  watch: {
    winnersBracket(value: Table, old: Table) {
      old = old ?? [];
      const contentChanged =
        value.length !== old.length ||
        value.some(({ rowKey }, i) => rowKey !== old[i].rowKey);
      if (contentChanged) {
        // reset connections
        this.connectors.reset();
        this.connectMatches(
          this.winnersBracket.map(({ row }) =>
            row.filter(notNull).map((r) => r.id)
          )
        );
      }
    },
  },
  async created() {
    await this.$nextTick();
    await this.connectors.setContainer(this.$el);
    this.connectMatches(
      this.winnersBracket.map(({ row }) => row.filter(notNull).map((r) => r.id))
    );
  },
  methods: {
    getMatchElementId(matchId: number) {
      return `${this.bracketId}-${matchId}`;
    },
    connectMatches(rounds: number[][]) {
      const helper = (x: {
        m: number;
        next: number | null;
      }): x is { m: number; next: number } => {
        return x.next !== null;
      };
      const data = rounds
        .flat()
        .map((m) => ({ m, next: this.model.matches[m].winnerNext }))
        .filter(helper);
      for (const { m, next } of data) {
        this.connectors.connect({
          source: this.getMatchElementId(m),
          target: this.getMatchElementId(next),
        });
      }
    },
    onMatchClick(id: number) {
      if (this.matchEditorId !== null) {
        return;
      }
      this.matchEditorId = id;
    },
    roundsToTable(rounds: number[][]): ElementVM[][] {
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
        matrix[current][r] = matchToVM(this.model, rounds[r][m], this.$i18n);
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
    winnersRounds(): string[] {
      if (this.winnersBracket.length > 0) {
        return nCopies(this.winnersBracket[0].row.length, () => "BO3");
      }
      return [];
    },
    winnersBracket(): Table {
      if (isDoubleElimination(this.model)) {
        const winners = this.model.winnersRounds;
        const rounds = winners.slice(0, winners.length - 1);

        const finalsVM = this.matchToVM(winners.slice(-1)[0][0]);
        const table = this.roundsToTable(rounds);
        const finalsRow = table.findIndex((row) => row.slice(-1)[0] !== null);

        table.forEach((row, j) => {
          // finals
          const extraColumns = [j == finalsRow ? finalsVM : null];
          if (finalsVM.next !== null) {
            // extra match
            const element: ElementVM =
              j == finalsRow ? this.matchToVM(finalsVM.next) : null;
            extraColumns.push(element);
          }
          row.push(...extraColumns);
        });

        return table.map(getRowWithKey);
      } else if (isSingleElimination(this.model)) {
        return this.roundsToTable(this.model.winnersRounds).map(getRowWithKey);
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
.brackets {
  position: relative;
}

.match-cell {
  padding: 0 30px;
}
</style>
