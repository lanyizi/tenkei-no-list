<template>
  <div id="app">
    <img alt="Vue logo" src="./assets/logo.png">
    <brackets v-if="tournament" :model="tournament"/>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import Brackets from './components/Brackets.vue';
import { Tournament } from './models';

export default Vue.extend({
  name: 'App',
  components: {
    Brackets
  },
  data: () => ({
    playerList: [
      '节操问题', 
      '节操提问', 
      '问题节操', 
      '洁草闻啼'
    ],
    tournament: null as Tournament | null
  })
});
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
