<template>
  <div>
    <div v-if="user >= 0">
      <div v-if="setup != null">
        <SetupComponent :user="user" :referee-names="refereeNames" v-model="setup" />
        <button @click="createTournament">{{ $t('generic.createTournament') }}</button>
        <button @click="createAndStart">{{ $t('tournamentSetup.createAndStart') }}</button>
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
import Auth from "@/components/Auth.vue";
import SetupComponent from "@/components/Setup.vue";
import { Setup } from "@/models/setup";
export default Vue.extend({
  components: { SetupComponent },
  props: {
    user: Number,
    refereeNames: Array as () => string[],
  },
  mounted() {
    ((window as unknown) as any).ccomponent = this;
  },
  data: () => ({
    name: "",
    setup: null as Setup | null,
  }),
  methods: {
    setupModel() {
      this.setup = new Setup(this.user);
      this.setup.information.name = this.name;
    },
    async createTournament() {
      alert("not implemented");
    },
    async createAndStart() {
      await this.createTournament();
      alert(this.$t('tournamentSetup.startWarning'))
      alert("not implemented");
    }
  },
});
</script>