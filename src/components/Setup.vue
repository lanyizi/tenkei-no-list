<template>
  <div>
    <InformationComponent :read-only="false" :referee-names="refereeNames" v-model="information"></InformationComponent>
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
            <input type="text" v-if="players === editedPlayers" v-model="players[i]" />
            <template v-else>{{player}}</template>
          </td>
          <td>
            <button @click="removePlayer(i)">{{ $t('generic.remove') }}</button>
          </td>
        </tr>
      </tbody>
    </table>
    <div class="settings">
      <h3 class="settings-title">{{ $t('tournamentSetup.type') }}</h3>// needs to change to value
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
    </div>
  </div>
</template>
<script lang="ts">
import Vue from "vue";
import SingleSelection from "./SingleSelection.vue";
import InformationComponent from "./Information.vue";
import { Tournament } from "@/models/tournament";
import { Setup, Information, Settings } from "@/models/setup";

type Model = Setup | Tournament;

export default Vue.extend({
  components: {
    SingleSelection,
    InformationComponent,
  },
  props: {
    value: Object as () => Model,
    refereeNames: Array as () => string[],
  },
  data: () => ({
    playersInput: "",
    editedPlayers: null as string[] | null,
    editedInformation: {} as Partial<Information>,
    editedSettings: null as Settings | null,
  }),
  mounted() {
    ((window as unknown) as any).ccomponent = this;
  },
  methods: {
    addPlayers() {
      const newPlayers = this.playersInput
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      this.editedPlayers = this.players.concat(newPlayers);
    },
    removePlayer(index: number) {
      this.editedPlayers = this.players.filter((_, i) => i !== index);
    },
    save() {
      const updating = { ...this.value };
      if (updating.status === "setup") {
        if (this.editedSettings !== null) {
          updating.settings = this.editedSettings;
        }
      }

      updating.information = {
        ...updating.information,
        ...this.editedInformation,
      };

      if (this.editedPlayers !== null) {
        updating.players = this.editedPlayers;
      }
    },
  },
  computed: {
    information: {
      get(): Information {
        return { ...this.value.information, ...this.editedInformation };
      },
      set(value: Information) {
        this.editedInformation = value;
      },
    },
    players: {
      get(): string[] {
        return this.editedPlayers ?? this.value.players;
      },
      set(value: string[]) {
        this.editedPlayers = value;
      },
    },
    types(): ["se" | "de", string][] {
      return [
        ["se", `${this.$t("generic.singleElimination")}`],
        ["de", `${this.$t("generic.doubleElimination")}`],
      ];
    },
    settings: {
      get(): Settings {
        return this.editedSettings || this.value.settings;
      },
      set(value: Settings) {
        this.editedSettings = value;
      },
    },
    typeIndex: {
      get(): number {
        return this.types.findIndex(([t]) => t === this.settings.mode);
      },
      set(value: number) {
        const mode = this.types[value][0];
        if (mode === "se") {
          this.settings = { mode, hasThirdPlace: true };
        } else {
          this.settings = { mode, hasExtraMatch: true };
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
  },
});
</script>