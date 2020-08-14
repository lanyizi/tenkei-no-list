<template>
  <div>
    <template v-if="value >= 0">
      <span>{{ $t('auth.currentUser', { username: refereeNames[value] }) }}</span>
      <button @click="logOut">{{ $t('auth.logout') }}</button>
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
import { request } from "@/request";
import { has } from '@/utils';
import isObject from 'lodash/isObject';

export default Vue.extend({
  props: {
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
      const json = await request("get", "/~", token);
      if(!isObject(json) || !has(json, 'user')) {
        return;
      }
      const user = parseInt(`${json.user}`) ?? -1;
      this.$emit("input", user);
      if (user !== -1) {
        this.$emit("token", token);
      }
    },
    logOut() {
      this.$emit("input", -1);
      this.$emit("token", "");
    },
  },
});
</script>