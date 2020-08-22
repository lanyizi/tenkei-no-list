<template>
  <div>
    <v-btn dark v-if="value >= 0" @click="logOut">{{ $t('auth.logoutUser', { username }) }}</v-btn>
    <v-dialog v-else max-width="400" v-model="openDialog">
      <template v-slot:activator="{ on, attrs }">
        <v-btn dark text v-bind="attrs" v-on="on">{{ $t('auth.login') }}</v-btn>
      </template>
      <v-card>
        <v-card-title class="headline grey lighten-2">{{ $t('auth.title') }}</v-card-title>
        <v-card-text>
          <v-form>
            <v-text-field
              prepend-icon="mdi-account-circle"
              :label="$t('auth.username')"
              v-model="username"
            />
            <v-text-field
              prepend-icon="mdi-lock"
              background-color="white"
              :label="$t('auth.password')"
              v-model="password"
            />
            <span class="text-body-1">{{ $t('auth.localStorageWarning') }}</span>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-btn color="success" @click="logIn">{{ $t('auth.login') }}</v-btn>
          <v-spacer />
          <v-btn color="info" @click="openDialog = false">{{ $t('generic.cancel') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
<script lang="ts">
import Vue from "vue";
import { request } from "@/request";
import { has } from "@/utils";
import isObject from "lodash/isObject";

const localStorageKey = "token";

export default Vue.extend({
  props: {
    value: Number,
  },
  data: () => ({
    openDialog: false,
    username: "",
    password: "",
  }),
  mounted() {
    const stored = localStorage.getItem(localStorageKey);
    if (stored) {
      this.tokenLogIn(stored);
    }
  },
  methods: {
    async tokenLogIn(token: string) {
      const json = await request("GET", "/~", token);
      if (!isObject(json) || !has(json, "user")) {
        return;
      }
      const user = parseInt(`${json.user}`) ?? -1;
      this.$emit("input", user);
      if (user !== -1) {
        this.username = atob(token.split(" ")[0]);
        this.$emit("token", token);
        this.openDialog = false;
        localStorage.setItem(localStorageKey, token);
      } else {
        localStorage.clearItem(localStorageKey);
      }
    },
    logIn() {
      const token = `${btoa(this.username)} ${btoa(this.password)}`;
      return this.tokenLogIn(token);
    },
    logOut() {
      this.$emit("input", -1);
      this.$emit("token", "");
    },
  },
});
</script>