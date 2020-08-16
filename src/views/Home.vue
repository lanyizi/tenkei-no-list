<template>
  <div class="home">
    <img alt="Vue logo" src="../assets/logo.png" />
    {{ $t('title') }}
    <div v-if="placeholderMessage">{{ placeholderMessage }}</div>
    <table v-else>
      <thead>
        <tr>
          <th>{{ $t('information.name') }}</th>
          <th>{{ $t('information.organizer') }}</th>
          <th>{{ $t('bracket.numberOfPlayers') }}</th>
          <th>{{ $t('tournamentSetup.type') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="{id, information, players, settings} in descs" :key="id">
          <td>
            <router-link :to="{ name: 'Tournament', params: { id } }">{{ information.name }}</router-link>
          </td>
          <td>{{ referees.get(information.organizer) }}</td>
          <td>{{ players.length }}</td>
          <td>{{ tournamentType(settings.mode) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import { TranslateResult } from "vue-i18n";
import { request, loadReferees } from "@/request";
import { isArray } from "@/utils";
import { isSetupLike, SetupLike } from "@/models/setup";
import { WithID, hasId } from "@/models/validations";

const assertIsSetupLikeWithID: (
  descs: unknown
) => asserts descs is WithID<SetupLike>[] = (descs) => {
  if (!isArray(descs, isSetupLike)) {
    throw Error("Response is not SetupLike[]");
  }
  if (!isArray(descs, hasId)) {
    throw Error("Response is not WithID[]");
  }
};

export default Vue.extend({
  data: () => ({
    placeholderMessage: "" as TranslateResult,
    descs: [] as WithID<SetupLike>[],
    referees: new Map<number, string>(),
  }),
  props: {
    token: String,
  },
  timers: {
    loadTournamentDescs: {
      immediate: true,
      repeat: true,
      autostart: true,
      time: 30_000,
    },
  },
  methods: {
    async loadTournamentDescs() {
      try {
        this.placeholderMessage = this.$t("generic.loading");
        const [descs, referees] = await Promise.all([
          request("GET", "/tournamentDescs", this.token),
          loadReferees(),
        ]);
        assertIsSetupLikeWithID(descs);
        this.descs = descs.sort((a, b) => b.id - a.id);
        this.referees = referees;
        this.placeholderMessage = "";
      } catch (why) {
        this.placeholderMessage = this.$t("generic.cannotLoad", { why });
      }
    },
    tournamentType(type: string) {
      switch (type) {
        case "se":
          return this.$t("singleElimination");
        case "de":
          return this.$t("doubleElimination");
        default:
          return this.$t("generic.unhandledError");
      }
    },
  },
});
</script>