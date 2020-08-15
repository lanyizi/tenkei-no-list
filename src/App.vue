<template>
  <div id="app">
    <div id="nav">
      <router-link to="/">Home</router-link>|
      <router-link to="/new">New</router-link>|
      <router-link to="/about">About</router-link>
    </div>
    <Auth :referee-names="refereeNames" v-model="user" @token="token = $event"></Auth>
    <router-view :user="user" :token="token" :referee-names="refereeNames" />
  </div>
</template>
<script lang="ts">
import Vue from "vue";
import Auth from "@/components/Auth.vue";
import { isArray } from "@/utils";
import { request } from "@/request";
import isString from "lodash/isString";

export default Vue.extend({
  components: {
    Auth,
  },
  data: () => ({
    user: -1,
    token: "",
    refereeNames: [] as string[],
  }),
  methods: {
    async updateReferees() {
      const names = await request("GET", "/refereeNames").catch(() => null);
      if (!isArray(names, isString)) {
        return;
      }
      this.refereeNames = names;
    },
  },
  timers: {
    updateReferees: {
      autostart: true,
      repeat: true,
      immediate: true,
      time: 60_000,
    },
  },
});
</script>
<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  /*text-align: center;*/
  color: #2c3e50;
}

#nav {
  padding: 30px;
}

#nav a {
  font-weight: bold;
  color: #2c3e50;
}

#nav a.router-link-exact-active {
  color: #42b983;
}
</style>
