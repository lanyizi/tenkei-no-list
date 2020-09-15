<template>
  <div>
    <div v-if="token">
      <div v-if="placeholderMessage != null">{{ placeholderMessage }}</div>
      <div v-else>
        <SetupComponent v-if="model" :token="token" v-model="model" />
        <div v-else>{{ $t('generic.unhandledError') }}</div>
        <v-btn
          :disabled="disabled"
          v-on:click="endAction(saveTournament)"
        >{{ $t('generic.save') }}</v-btn>
        <v-btn
          :disabled="disabled"
          v-on:click="endAction(createTournament)"
        >{{ $t('tournamentSetup.start') }}</v-btn>
        <v-btn :disabled="disabled" @click="endAction">{{ $t('generic.cancel') }}</v-btn>
      </div>
    </div>
    <div v-else>{{ $t('auth.requireLogIn') }}</div>
  </div>
</template>
<script lang="ts">
import Vue from "vue";
import SetupComponent from "@/components/Setup.vue";
import { Setup } from "@/models/setup";
import { Tournament, createFromSetup } from "@/models/tournament";
import { loadTournament, request } from "@/request";
import { TranslateResult } from "vue-i18n";
import pick from "lodash/pick";

export default Vue.extend({
  components: {
    SetupComponent,
  },
  props: {
    id: Number,
    token: String,
  },
  data: () => ({
    model: null as Setup | Tournament | null,
    placeholderMessage: null as TranslateResult | null,
    disabled: false,
  }),
  watch: {
    id: {
      immediate: true,
      handler() {
        this.loadTournament();
      },
    },
  },
  methods: {
    async loadTournament() {
      try {
        this.placeholderMessage = this.$t("generic.loading");
        this.model = await loadTournament(this.id);
        this.placeholderMessage = null;
      } catch (why) {
        this.placeholderMessage = this.$t("generic.cannotLoad", { why });
      }
    },
    saveTournament() {
      if (this.model == null) {
        throw Error("Setup is null");
      }
      // if tournament has started, then we can only edit information
      // TODO: allow edit player names
      const [method, data] =
        this.model.status === "setup"
          ? ["PUT" as const, this.model]
          : ["PATCH" as const, pick(this.model, "information", "roundFormats")];
      return request(method, `/tournaments/${this.id}`, this.token, data).then(
        () => true
      );
    },
    createTournament() {
      if (this.model == null) {
        throw Error("Setup is null");
      }
      if (this.model.status !== "setup") {
        throw Error("Tournament already started");
      }
      if (!confirm(`${this.$t("tournamentSetup.startWarning")}`)) {
        return Promise.resolve(false);
      }
      return request("PUT", `/tournaments/${this.id}`, this.token, {
        id: this.id,
        ...createFromSetup(this.model),
      }).then(() => true);
    },
    async endAction(action?: () => Promise<boolean>) {
      this.disabled = true;
      try {
        if (action !== undefined) {
          if (!(await action())) {
            return;
          }
        }
        await this.$router.push(`/${this.id}`);
      } catch (e) {
        alert(e);
      } finally {
        this.disabled = false;
      }
    },
  },
});
</script>