<template>
  <div id="app">
    <div id="nav">
      <router-link to="/">Home</router-link>|
      <router-link to="/new">New</router-link>|
      <router-link to="/about">About</router-link>
    </div>
    <Auth :api-url="apiUrl" :referee-names="refereeNames" v-model="user" @token="token = $event"></Auth>
    <router-view :api-url="apiUrl" :user="user" :token="token" :referee-names="refereeNames" />
  </div>
</template>
<script lang="ts">
import Vue from "vue";
import Auth from "@/components/Auth.vue";

export default Vue.extend({
  components: {
    Auth
  },
  data: () => ({
    apiUrl: 'http://192.168.43.228:4000',
    user: -1,
    token: '',
    refereeNames: ["miao", "mie"],
  }),
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
