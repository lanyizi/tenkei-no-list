<template>
  <div>
    <h2>{{ title }}</h2>

    <h3 class="settings-title">{{ $t('tournamentSetup.playerListSettings.title') }} </h3>
    <table class="player-list">
      <tbody>
        <tr>
          <td colspan="2">
            {{ $t('tournamentSetup.playerListSettings.addHint') }}
          </td>
          <td>
            <button>{{ $t('tournamentSetup.playerListSettings.random') }}</button>
          </td>
        </tr>
        <tr>
          <td></td>
          <td><textarea rows="1"></textarea></td>
          <td>
            <button>{{ $t('generic.add') }}</button>
          </td>
        </tr>
        <tr v-for="(player, i) in players" :key="player">
          <td>{{i+1}}</td>
          <td>{{player}}</td>
          <td>
            <button>{{ $t('tournamentSetup.playerListSettings.rename') }}</button>
            <button>{{ $t('generic.remove') }}</button>
          </td>
        </tr>
      </tbody>
    </table>
    <div class="settings">
      <h3 class="settings-title">{{ $t('tournamentSetup.type') }}</h3>
      // needs to change to value
      <single-selection :descriptions="typesName" v-model="typeIndex" />
      <div v-if="type === 'se'">
        <label class="settings-entry">
          <input type="checkbox" v-model="hasThirdPlaceMatch" />
          {{ $t('tournamentSetup.hasThirdPlaceMatch') }}
        </label>
      </div>
      <div v-else-if="type === 'de'">
        <h4
          class="settings-title"
        >{{ $t('tournamentSetup.doubleEliminationFinalsExtraMatch.title') }}</h4>
        <single-selection :descriptions="extraMatchDescriptions" v-model="extraMatchIndex" />
      </div>
    </div>
    <div class="settings">
      <h3 class="settings-title">{{ $t('tournamentSetup.referees.title') }}</h3>
      <span class="settings-description">{{ $t('tournamentSetup.referees.description') }}</span>
      <table class="referee-list">
        <thead>
          <td colspan="2">{{ $t('tournamentSetup.referees.list') }}</td>
        </thead>
        <tr class="settings-entry" v-for="referee in refereeList" :key="referee">
          <td>
            <input
              type="checkbox"
              :checked="selectedReferees.has(referee)"
              v-on:change="setReferee($event.target.checked, referee)"
            />
          </td>
          <td>{{ referee }}</td>
        </tr>
      </table>
    </div>
  </div>
</template>
<script lang="ts">
import Vue from "vue";
import SingleSelection from "./SingleSelection.vue";
import { Tournament } from "@/models/tournament";
import { Setup } from "@/models/setup";

export default Vue.extend({
  components: {
    SingleSelection,
  },
  props: {
    title: String,
    saveButtonText: String,
    setup: Object as () => Setup | Tournament,
    refereeList: Array as () => string[],
  },
  data: () => ({
    typeIndex: -1,
    extraMatchIndex: 0,
    hasThirdPlaceMatch: false,
    selectedReferees: new Set<string>(),
    players: ['inkian', 'mozhe', 'darkzhe', 'dieflamme', 'jiecao']
  }),
  computed: {
    typesName(): string[] {
      
      return [
        `${this.$t("generic.singleElimination")}`,
        `${this.$t("generic.doubleElimination")}`,
      ];
    },
    type(): "se" | "de" | undefined {
      return (["se", "de"] as const)[this.typeIndex];
    },
    extraMatchDescriptions(): string[] {
      return [
        `${this.$t("tournamentSetup.doubleEliminationFinalsExtraMatch.yes")}`,
        `${this.$t("tournamentSetup.doubleEliminationFinalsExtraMatch.no")}`,
      ];
    },
  },
  methods: {
    setReferee(checked: boolean, referee: string) {
      this.selectedReferees[checked ? "add" : "delete"](referee);
    },
  },
});
</script>