<template>
  <div class="lanyi-brackets" sticky-container>
    <v-dialog
      max-width="600"
      :value="matchEditorId != null"
      @input="matchEditorId = $event ? matchEditorId : null"
    >
      <MatchEditor
        v-if="matchEditorId != null"
        :best-of="bo"
        :token="token"
        :tournament="model"
        :match-id="matchEditorId"
        @refresh-requested="$emit('refresh-requested')"
        @close="matchEditorId = null"
      ></MatchEditor>
    </v-dialog>
    <div ref="jsplumb-container" style="position: relative;">
      <table v-for="({headers, cells}, i) in brackets" :key="i">
        <tr>
          <th v-for="({cellClasses, classes, content}, i) in headers" :key="i" :class="cellClasses">
            <div v-sticky sticky-offset="stickyHeaderOffsets" class="lanyi-header-wrapper">
              <div :class="classes">{{ content }}</div>
            </div>
          </th>
        </tr>
        <tr v-for="{row, rowKey} in cells" :key="rowKey">
          <td
            v-for="({cellClasses, classes, key, content}, i) in row"
            :key="key"
            :class="cellClasses"
          >
            <Match
              v-if="content != null"
              :id="getMatchElementId(content.id)"
              :value="content"
              @click.native="bo = winnersRounds[i]; onMatchClick(content.id);"
              :class="classes"
            ></Match>
            <div v-else :class="classes" />
          </td>
        </tr>
      </table>
    </div>
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
import { nCopies, notNull, iota } from "@/utils";
import jsPlumb, { jsPlumbInstance } from "jsplumb";
import { WithID } from "@/models/validations";
import { headerHeight } from "@/App.vue";
import isNull from "lodash/isNull";
import VueI18n from "vue-i18n";

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
const tableChanged = (value: Table | null, old?: Table | null) => {
  const v = value ?? [];
  const o = old ?? [];
  return (
    v.length !== o.length || v.some(({ rowKey }, i) => rowKey !== o[i].rowKey)
  );
};

type CellVMBase = {
  cellClasses: string[];
  classes: string[];
};

type HeaderVM = CellVMBase & { content: VueI18n.TranslateResult };

type CellVM = CellVMBase & {
  key: string;
  content: ElementVM;
};

type BracketRowVM = {
  row: CellVM[];
  rowKey: string;
};

type BracketVM = {
  headers: HeaderVM[];
  cells: BracketRowVM[];
};

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
      PaintStyle: { stroke: "black", strokeWidth: 3 },
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
    bo: 3,
  }),
  props: {
    model: Object as () => WithID<Tournament>,
    token: String,
  },
  watch: {
    winnersBracket(value: Table, old?: Table) {
      if (tableChanged(value, old)) {
        this.connectMatches();
      }
    },
    losersBracket(value: Table | null, old?: Table | null) {
      if (tableChanged(value, old)) {
        this.connectMatches();
      }
    },
    windowWidth() {
      this.connectMatches();
    },
    windowHeight() {
      this.connectMatches();
    },
  },
  async mounted() {
    const container = this.$refs["jsplumb-container"];
    if (!(container instanceof Element)) {
      throw Error("Invlid jsplumb container ref");
    }
    await this.connectors.setContainer(container);
    this.connectMatches();
  },
  methods: {
    getMatchElementId(matchId: number) {
      return `${this.bracketId}-${matchId}`;
    },
    connectMatches() {
      // reset connections
      this.connectors.reset();
      const matchVMs = this.winnersBracket
        .concat(this.losersBracket ?? [])
        .map(({ row }) => row.filter(notNull))
        .flat();
      for (const { id, next } of matchVMs) {
        if (next !== null) {
          this.connectors.connect({
            source: this.getMatchElementId(id),
            target: this.getMatchElementId(next),
          });
        }
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

        if (previousIndices.length === 1) {
          assign(r - 1, previousIndices[0], begin, end);
        } else if (previousIndices.length === 2) {
          assign(r - 1, previousIndices[0], begin, current);
          assign(r - 1, previousIndices[1], current + 1, end);
        }
      };

      assign(rounds.length - 1, 0, 0, rows);
      return matrix.filter((row) => row.some((element) => element !== null));
    },
    getBracketVM(name: VueI18n.TranslateResult, table: Table): BracketVM {
      if (table.length === 0) {
        return {
          headers: [],
          cells: [],
        };
      }

      const rounds = table[0].row.length;

      const getNamePlaceHolder = (): CellVM => ({
        content: null,
        cellClasses: ["lanyi-bracket-name-placeholder"],
        classes: ["lanyi-match-gap"],
        // there will only be one placeholder per row
        // so it's fine to have a constant key
        key: "gen-bracket-name-placeholder",
      });

      const toCellVM = (content: ElementVM, index: number): CellVM => ({
        cellClasses: ["lanyi-match-cell"],
        classes: [isNull(content) ? "lanyi-match-gap" : "lanyi-match"],
        key: isNull(content) ? `gen-gap-${index}` : `match-${content.id}`,
        content,
      });

      const getGapRow = (rowKey: string): BracketRowVM => ({
        rowKey,
        row: [
          getNamePlaceHolder(),
          ...iota(rounds).map((i) => toCellVM(null, i)),
        ],
      });

      const mainRows = table.map(
        ({ row, rowKey }): BracketRowVM => ({
          rowKey,
          row: [getNamePlaceHolder(), ...row.map(toCellVM)],
        })
      );

      const bestOfs = nCopies(rounds, () => "BO3");
      const mainHeaders = bestOfs.map(
        (content): HeaderVM => ({
          cellClasses: ["lanyi-header-cell"],
          classes: ["lanyi-bracket-round"],
          content,
        })
      );

      return {
        headers: [
          {
            cellClasses: ["lanyi-header-cell", "lanyi-bracket-name-cell"],
            classes: ["lanyi-bracket-name"],
            content: name,
          },
          ...mainHeaders,
        ],
        cells: [
          getGapRow("gen-gap-row-first"),
          ...mainRows,
          getGapRow("gen-gap-row-last"),
        ],
      };
    },
  },
  computed: {
    stickyHeaderOffsets(): { top: number } {
      return { top: headerHeight };
    },
    winnersRounds(): number[] {
      const bo = nCopies(this.winnersBracket[0].row.length, () => 3);
      bo[bo.length - 1] = 5;
      bo[bo.length - 2] = 5;
      return bo;
    },
    winnersBracket(): Table {
      if (isDoubleElimination(this.model)) {
        const rounds = this.model.winnersRounds.slice();
        const finalsId = rounds[rounds.length - 1][0];
        const finals = this.model.matches[finalsId];
        if (finals.winnerNext !== null) {
          // extra match
          rounds.push([finals.winnerNext]);
        }
        return this.roundsToTable(this.model.winnersRounds).map(getRowWithKey);
      } else if (isSingleElimination(this.model)) {
        return this.roundsToTable(this.model.winnersRounds).map(getRowWithKey);
      }
      return [];
    },
    brackets(): BracketVM[] {
      const brackets = [
        this.getBracketVM(
          this.$t("bracket.winnersBracket"),
          this.winnersBracket
        ),
      ];
      const losers = this.losersBracket;
      if (losers) {
        brackets.push(
          this.getBracketVM(this.$t("bracket.losersBracket"), losers)
        );
      }
      return brackets;
    },
    losersRounds(): number[] {
      if (this.losersBracket != null) {
        const bo = nCopies(this.losersBracket[0].row.length, () => 1);
        bo[bo.length - 1] = 5;
        bo[bo.length - 2] = 3;
        return bo;
      }
      return [];
    },
    losersBracket(): Table | null {
      if (
        isDoubleElimination(this.model) &&
        this.model.losersRounds.length > 0
      ) {
        return this.roundsToTable(this.model.losersRounds).map(getRowWithKey);
      }
      return null;
    },
  },
});
</script>
<style scoped>
.lanyi-brackets {
  width: 100%;
  overflow-x: auto;
}

table {
  border-collapse: collapse;
}

th,
td {
  white-space: nowrap;
}

.lanyi-header-wrapper,
.lanyi-match-cell {
  padding: 0 30px;
}

.lanyi-header-cell.lanyi-bracket-name-cell {
  padding-right: 30px;
  padding-left: 0;
}

.lanyi-bracket-name-cell .lanyi-header-wrapper {
  padding: 0;
}

.lanyi-bracket-name-placeholder > * {
  width: 150px;
}

.lanyi-match-cell > * {
  width: 250px;
  height: 60px;
}

.lanyi-bracket-name,
.lanyi-bracket-round {
  font-size: 130%;
  font-weight: bold;
  padding: 5px 0;
  color: white;
  text-shadow: 0 0 5px #cccccc;
}

.lanyi-bracket-round {
  background: rgba(255, 57, 36, 0.8);
}

.lanyi-header-wrapper {
  background: rgba(255, 255, 255, 0.22);
  border-bottom: 3px solid white;
}

.lanyi-match-gap {
  background: url("~@/assets/main/mid/M_BO3list.png") 100% 100%;
  background: linear-gradient(
    90deg,
    rgba(0, 0, 0, 0.15) 0%,
    rgba(0, 0, 0, 0.15) 80%,
    rgba(0, 0, 0, 0.4) 100%
  );
  border-right: 2px solid rgba(0, 0, 0, 0.5);
}
</style>
