<template>
  <div>
    <div v-if="user >= 0">
      <div v-if="setup != null">
        <SetupComponent :user="user" :referee-names="refereeNames" v-model="setup" />
        <button :disabled="disabled" @click="createTournament">{{ $t('generic.createTournament') }}</button>
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
import { Setup } from "@/models/setup";
import { hasId } from "@/models/validations";
import { createFromSetup } from "@/models/tournament";
export default Vue.extend({
  components: { SetupComponent },
  props: {
    apiUrl: String,
    user: Number,
    token: String,
    refereeNames: Array as () => string[],
  },
  data: () => ({
    name: "",
    setup: null as Setup | null,
    disabled: false,
  }),
  methods: {
    setupModel() {
      this.setup = new Setup(this.user);
      this.setup.information.name = this.name;
    },
    async createTournament() {
      this.disabled = true;
      try {
        const response = await fetch(`${this.apiUrl}/tournaments`, {
          method: "post",
          headers: {
            Authentication: this.token,
            'Content-Type': 'application/json'
          },
          mode: "cors",
          body: JSON.stringify(this.setup),
        });
        if (!response.ok) {
          throw Error("create failed");
        }
        const created = await response.json();
        if (!hasId(created)) {
          throw Error("unexpected response");
        }
        await this.$router.push(`/${created.id}`);
      } finally {
        this.disabled = false;
      }
    },
    async createAndStart() {
      if (this.setup === null) {
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