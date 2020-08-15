<template>
  <div>
    <div v-if="user >= 0">
      <div v-if="setup != null">
        <SetupComponent :user="user" :referee-names="refereeNames" v-model="setup" />
        <button :disabled="disabled" @click="createTournament">{{ $t('createTournament') }}</button>
        <button
          :disabled="disabled"
          @click="createAndStart"
        >{{ $t('tournamentSetup.createAndStart') }}</button>
      </div>
      <div v-else>
        <label>
          {{ $t('information.name') }}
          <input type="text" v-model="name" />
        </label>
        <button :disabled="!name" @click="setupModel">{{ $t('generic.continue') }}</button>
      </div>
    </div>
    <div v-else>{{ $t('auth.requireLogIn') }}</div>
  </div>
</template>
<script lang="ts">
import Vue from "vue";
import SetupComponent from "@/components/Setup.vue";
import { Setup, createSetup } from "@/models/setup";
import { hasId } from "@/models/validations";
import { createFromSetup, Tournament } from "@/models/tournament";
import { request } from "@/request";

export default Vue.extend({
  components: { SetupComponent },
  props: {
    user: Number,
    token: String,
    refereeNames: Array as () => string[],
  },
  data: () => ({
    name: "",
    setup: null as Setup | Tournament | null,
    disabled: false,
  }),
  methods: {
    setupModel() {
      this.setup = createSetup(this.user);
      this.setup.information.name = this.name;
    },
    async createTournament() {
      this.disabled = true;
      try {
        if (this.setup == null) {
          throw Error("Setup is null");
        }
        const created = await request(
          "POST",
          "/tournaments",
          this.token,
          this.setup
        );
        if (!hasId(created)) {
          throw Error("Unexpected response");
        }
        await this.$router.push(`/${created.id}`);
      } finally {
        this.disabled = false;
      }
    },
    async createAndStart() {
      if (this.setup === null || this.setup.status !== 'setup') {
        throw Error("Unexpected");
      }
      if (!confirm(`${this.$t("tournamentSetup.startWarning")}`)) {
        return;
      }
      this.setup = createFromSetup(this.setup);
      await this.createTournament();
    },
  },
});
</script>