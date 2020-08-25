<template>
  <div>
    <InformationComponent :read-only="false" v-model="information" />
    <h3 class="settings-title">{{ $t('tournamentSetup.playerListSettings.title') }}</h3>
    <table class="player-list">
      <tbody>
        <tr>
          <td colspan="2">{{ $t('tournamentSetup.playerListSettings.addHint') }}</td>
          <td>
            <button>{{ $t('tournamentSetup.playerListSettings.random') }}</button>
          </td>
        </tr>
        <tr>
          <td></td>
          <td>
            <textarea rows="1" v-model="playersInput"></textarea>
          </td>
          <td>
            <button @click="addPlayers">{{ $t('generic.add') }}</button>
          </td>
        </tr>
        <tr v-for="(player, i) in players" :key="i">
          <td>{{i+1}}</td>
          <td>
            <input type="text" :value="players[i]" @input="updatePlayer(i, $event.target.value)" />
          </td>
          <td>
            <button @click="removePlayer(i)">{{ $t('generic.remove') }}</button>
          </td>
        </tr>
      </tbody>
    </table>
    <v-card class="settings">
      <v-card-title>{{ $t('tournamentSetup.type') }}</v-card-title>
      <SingleSelection :descriptions="types.map(([,d]) => d)" v-model="typeIndex" />
      <div v-if="settings.mode === 'se'">
        <label class="settings-entry">
          <input type="checkbox" v-model="hasThirdPlaceMatch" />
          {{ $t('tournamentSetup.hasThirdPlaceMatch') }}
        </label>
      </div>
      <div v-else-if="settings.mode === 'de'">
        <h4
          class="settings-title"
        >{{ $t('tournamentSetup.doubleEliminationFinalsExtraMatch.title') }}</h4>
        <SingleSelection :descriptions="extraMatchDescriptions" v-model="extraMatchIndex" />
      </div>
    </v-card>
    <v-card>
      <v-card-title>{{ $t('tournamentSetup.bestOfs.title') }}</v-card-title>
      <v-card-text>{{ $t('tournamentSetup.bestOfs.description') }}</v-card-text>
      <v-text-field
        v-for="{ key, label, value, input, clear } in mainRoundFormats"
        :key="key"
        type="number"
        step="1"
        clearable
        :label="label"
        :value="value"
        @input="input"
        @click:clear="clear"
      />
      <template>
        <template v-if="settings.mode === 'se'"></template>
      </template>
    </v-card>
  </div>
</template>
<script lang="ts">
import Vue from "vue";
import { TranslateResult } from "vue-i18n";
import SingleSelection from "./SingleSelection.vue";
import InformationComponent from "./Information.vue";
import { Tournament } from "@/models/tournament";
import { Setup, Information, Settings } from "@/models/setup";

type Model = Setup | Tournament;
type RoundVM = {
  key: number;
  label: TranslateResult;
  value: string;
  input(e: string): void;
  clear(): void;
};

export default Vue.extend({
  components: {
    SingleSelection,
    InformationComponent,
  },
  props: {
    value: Object as () => Model,
  },
  data: () => ({
    playersInput: "",
  }),
  methods: {
    addPlayers() {
      const newPlayers = this.playersInput
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      this.players = this.players.concat(newPlayers);
    },
    updatePlayer(index: number, value: string) {
      this.players = this.players.map((n, i) => (i !== index ? n : value));
    },
    removePlayer(index: number) {
      this.players = this.players.filter((_, i) => i !== index);
    },
    update<K extends keyof Model>(updated: Pick<Model, K>) {
      this.$emit("input", { ...this.value, ...updated });
    },
    getRoundFormatsVM(index: number): RoundVM[] {
      const assign = (newValue: number[]) => {
        const roundFormats = this.value.roundFormats.slice();
        while (roundFormats.length <= index) {
          roundFormats.push([]);
        }
        roundFormats.splice(index, 1, newValue);
        console.log("updating", this.value.roundFormats, roundFormats);
        this.update({ roundFormats });
      };
      const current = this.value.roundFormats[index] ?? [];
      return [
        {
          key: current.length,
          label: this.$t(
            current.length !== 0
              ? "generic.add"
              : "tournamentSetup.bestOfs.default"
          ),
          value: "",
          input(e) {
            if (e !== null) {
              // null can be called when erasing elements
              // probably emitted when Vue rerender stuffs
              // (after some elements has been erased)
              assign([parseInt(e) || 0, ...current]);
            }
          },
          clear() {
            // do thing
          },
        },
        ...current.map(
          (v, i): RoundVM => ({
            key: current.length - i - 1,
            label: this.$t(
              `tournamentSetup.bestOfs.${(() => {
                switch (i) {
                  case 0:
                    return "default";
                  case current.length - 2:
                    return "semiFinals";
                  case current.length - 1:
                    return "finals";
                  default:
                    return "common";
                }
              })()}`
            ),
            value: `${v}`,
            input(e) {
              const edited = current.slice();
              edited.splice(i, 1, parseInt(e) || 0);
              console.log("input called");
              assign(edited);
            },
            clear() {
              const edited = current.slice();
              edited.splice(i, 1);
              console.log("clear called", current, edited);
              assign(edited);
            },
          })
        ),
      ];
    },
  },
  computed: {
    information: {
      get(): Information {
        return this.value.information;
      },
      set(information: Information) {
        this.update({ information });
      },
    },
    players: {
      get(): string[] {
        return this.value.players;
      },
      set(players: string[]) {
        this.update({ players });
      },
    },
    types(): ["se" | "de", string][] {
      return [
        ["se", `${this.$t("singleElimination")}`],
        ["de", `${this.$t("doubleElimination")}`],
      ];
    },
    settings: {
      get(): Settings {
        return this.value.settings;
      },
      set(settings: Settings) {
        this.update({ settings });
      },
    },
    typeIndex: {
      get(): number {
        return this.types.findIndex(([t]) => t === this.settings.mode);
      },
      set(value: number) {
        const mode = this.types[value][0];
        if (mode === "se") {
          this.update({
            settings: {
              mode,
              hasThirdPlace: true,
            },
            roundFormats: [[3, 5, 7]],
          });
        } else {
          this.update({
            settings: {
              mode,
              hasExtraMatch: true,
            },
            roundFormats: [
              [3, 5, 7],
              [1, 3, 5, 7],
            ],
          });
        }
      },
    },
    hasThirdPlaceMatch: {
      get(): boolean {
        if (this.settings.mode !== "se") {
          return false;
        }
        return this.settings.hasThirdPlace;
      },
      set(hasThirdPlace: boolean) {
        if (this.settings.mode !== "se") {
          return;
        }
        this.settings = { ...this.settings, hasThirdPlace };
      },
    },
    extraMatchDescriptions(): string[] {
      return [
        `${this.$t("tournamentSetup.doubleEliminationFinalsExtraMatch.yes")}`,
        `${this.$t("tournamentSetup.doubleEliminationFinalsExtraMatch.no")}`,
      ];
    },
    extraMatchIndex: {
      get(): number {
        if (this.settings.mode !== "de") {
          return -1;
        }
        return this.settings.hasExtraMatch ? 0 : 1;
      },
      set(index: number) {
        if (this.settings.mode !== "de") {
          return;
        }
        this.settings = { ...this.settings, hasExtraMatch: index === 0 };
      },
    },
    mainRoundFormats(): RoundVM[] {
      return this.getRoundFormatsVM(0);
    },
    losersRoundFormats(): RoundVM[] | null {
      if (this.settings.mode === "se") {
        return null;
      }
      return this.getRoundFormatsVM(1);
    },
  },
});
</script>