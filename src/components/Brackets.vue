<template>
  <div class="brackets">
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
    <table>
      <tr>
        <th v-for="(r, i) in winnersRounds" :key="i">BO{{ r }}</th>
      </tr>
      <tr v-for="{row, rowKey} in winnersBracket" :key="rowKey">
        <td v-for="(element, i) in row" :key="element ? element.id : `~${i}`" class="match-cell">
          <Match
            v-if="element != null"
            :id="getMatchElementId(element.id)"
            :value="element"
            @click.native="bo = winnersRounds[i]; onMatchClick(element.id);"
          ></Match>
        </td>
      </tr>
    </table>
    <template v-if="losersBracket">
      <h2 class="pa-2 white--text">{{ $t('bracket.losersBracket') }}</h2>
      <table>
        <tr>
          <th v-for="(r, i) in losersRounds" :key="i">BO{{ r }}</th>
        </tr>
        <tr v-for="{row, rowKey} in losersBracket" :key="rowKey">
          <td v-for="(element, i) in row" :key="element ? element.id : `~${i}`" class="match-cell">
            <Match
              v-if="element != null"
              :id="getMatchElementId(element.id)"
              :value="element"
              @click.native="bo = losersRounds[i]; onMatchClick(element.id);"
            ></Match>
          </td>
        </tr>
      </table>
    </template>
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
const tableChanged = (value: Table | null, old?: Table | null) => {
  const v = value ?? [];
  const o = old ?? [];
  return (
    v.length !== o.length || v.some(({ rowKey }, i) => rowKey !== o[i].rowKey)
  );
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
        // reset connections
        this.connectors.reset();
        this.connectMatches();
      }
    },
    losersBracket(value: Table | null, old?: Table | null) {
      if (tableChanged(value, old)) {
        // reset connections
        this.connectors.reset();
        this.connectMatches();
      }
    },
  },
  async created() {
    await this.$nextTick();
    await this.connectors.setContainer(this.$el);
    this.connectMatches();
  },
  methods: {
    getMatchElementId(matchId: number) {
      return `${this.bracketId}-${matchId}`;
    },
    connectMatches() {
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
  },
  computed: {
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
        const table = this.roundsToTable(this.model.winnersRounds);
        return table.map(getRowWithKey);
      } else if (isSingleElimination(this.model)) {
        return this.roundsToTable(this.model.winnersRounds).map(getRowWithKey);
      }
      return [];
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
      if (isDoubleElimination(this.model)) {
        const table = this.roundsToTable(this.model.losersRounds);
        return table.map(getRowWithKey);
      }
      return null;
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
