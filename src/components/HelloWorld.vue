<template>
  <div class="hello">
    <h1>{{ msg }}</h1>
    <p>
      For a guide and recipes on how to configure / customize this project,
      <br />check out the
      <a
        href="https://cli.vuejs.org"
        target="_blank"
        rel="noopener"
      >vue-cli documentation</a>.
    </p>
    <h3>Installed CLI Plugins</h3>
    <ul>
      <li>
        <a
          href="https://github.com/vuejs/vue-cli/tree/dev/packages/%40vue/cli-plugin-babel"
          target="_blank"
          rel="noopener"
        >babel</a>
      </li>
      <li>
        <a
          href="https://github.com/vuejs/vue-cli/tree/dev/packages/%40vue/cli-plugin-typescript"
          target="_blank"
          rel="noopener"
        >typescript</a>
      </li>
      <li>
        <a
          href="https://github.com/vuejs/vue-cli/tree/dev/packages/%40vue/cli-plugin-eslint"
          target="_blank"
          rel="noopener"
        >eslint</a>
      </li>
    </ul>
    <h3>Essential Links</h3>
    <ul>
      <li>
        <a href="https://vuejs.org" target="_blank" rel="noopener">Core Docs</a>
      </li>
      <li>
        <a href="https://forum.vuejs.org" target="_blank" rel="noopener">Forum</a>
      </li>
      <li>
        <a href="https://chat.vuejs.org" target="_blank" rel="noopener">Community Chat</a>
      </li>
      <li>
        <a href="https://twitter.com/vuejs" target="_blank" rel="noopener">Twitter</a>
      </li>
      <li>
        <a href="https://news.vuejs.org" target="_blank" rel="noopener">News</a>
      </li>
    </ul>
    <h3>Ecosystem</h3>
    <ul>
      <li>
        <a href="https://router.vuejs.org" target="_blank" rel="noopener">vue-router</a>
      </li>
      <li>
        <a href="https://vuex.vuejs.org" target="_blank" rel="noopener">vuex</a>
      </li>
      <li>
        <a
          href="https://github.com/vuejs/vue-devtools#vue-devtools"
          target="_blank"
          rel="noopener"
        >vue-devtools</a>
      </li>
      <li>
        <a href="https://vue-loader.vuejs.org" target="_blank" rel="noopener">vue-loader</a>
      </li>
      <li>
        <a href="https://github.com/vuejs/awesome-vue" target="_blank" rel="noopener">awesome-vue</a>
      </li>
    </ul>
    <textarea v-model="input" />
    <button @click="generate" />
    <table>
      <tr v-for="(row, j) in table" :key="j">
        <td v-for="(element, i) in row" in table :key="i">
          <div v-if="element != null">
            <div>{{ element.p1.name }}</div>
            <div>{{ element.p2.name }}</div>
          </div>
        </td>
      </tr>
    </table>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import { Model } from "../main";
import { iota, nCopies } from "../utils";

type PlayerVM = {
  name: string;
  score: string;
  isWinner: boolean;
};

type MatchVM = {
  id: number;
  p1: PlayerVM;
  p2: PlayerVM;
};

type ElementVM = MatchVM | null;

export default Vue.extend({
  name: "HelloWorld",
  data: () => ({
    input: "",
    model: new Model(["a", "b", "c", "d"], false),
  }),
  props: {
    msg: String,
  },
  methods: {
    generate() {
      this.model = new Model(
        this.input.split("\n").map((n) => n.trim()),
        false
      );
    },
  },
  computed: {
    table(): ElementVM[][] {
      const wb = this.model.winnersBracket;
      const rows = (1 << wb.length) - 1;

      const emptyColumn = () => nCopies(rows, (): ElementVM => null);
      const table = wb.map(emptyColumn);
      for (let i = table.length; i > 0; --i) {
        table.splice(i - 1, 0, emptyColumn());
      }

      const matchToVM = (matchId: number): MatchVM => {
        const match = this.model.matches[matchId];
        const playerToVM = (id: number | null, score: number | null) => ({
          name: id !== null ? this.model.players[id] : "~",
          score: score !== null ? score.toString() : " ",
          isWinner: id === match.winner,
        });
        return {
          id: matchId,
          p1: playerToVM(match.p1, match.p1Score),
          p2: playerToVM(match.p2, match.p2Score),
        };
      };
      const assign = (r: number, m: number, begin: number, end: number) => {
        const current = begin + ((end - 1) - begin) / 2;
        const matchId = wb[r].matches[m];
        table[r * 2][current] = matchToVM(wb[r].matches[m]);
        if (r == 0 || current == 0) {
          return;
        }
        const previousIndices = wb[r - 1].matches
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

      assign(wb.length - 1, 0, 0, rows);

      // swap columns and rows
      return iota(rows).map((y) => iota(table.length).map((x) => table[x][y]));
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
