<template>
  <div>
    <template v-if="value >= 0">
      <span>{{ $t('auth.currentUser', { username: refereeNames[value] }) }}</span>
      <button @click="$emit('user-changed', -1)">{{ $t('auth.logout') }}</button>
    </template>
    <template v-else>
      <input type="text" :placeholder="$t('auth.username')" v-model="username" />
      <input type="password" :placeholder="$t('auth.password')" v-model="password" />
      <button @click="logIn">{{ $t('auth.login') }}</button>
    </template>
  </div>
</template>
<script lang="ts">
import Vue from "vue";
export default Vue.extend({
  props: {
    apiUrl: String,
    value: Number,
    refereeNames: Array as () => string[],
  },
  data: () => ({
    username: "",
    password: "",
  }),
  methods: {
    async logIn() {
      const token = `${btoa(this.username)} ${btoa(this.password)}`;
      const response = await fetch(`${this.apiUrl}/~check`, {
        method: 'get',
        headers: {
          Authentication: token,
        },
        mode: 'cors'
      });
      const json = await response.json();
      const user = parseInt(json.user) || -1;
      this.$emit("input", user);
      if(user !== -1) {
        this.$emit("token", token);
      }
    },
  },
});
</script>