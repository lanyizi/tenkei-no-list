<template>
  <div v-if="placeholderMessage">{{ placeholderMessage }}</div>
  <table v-else>
    <thead>
      <tr>
        <th>{{ $t('auth.username') }}</th>
        <th>{{ $t('auth.password') }}</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          <input type="text" :placeholder="$t('auth.addReferee')" v-model="newUsername" />
        </td>
        <td>
          <input type="text" v-model="newPassword" />
        </td>
        <td>
          <button v-on:click="createReferee" :disabled="!allowCreation">{{ $t('generic.add') }}</button>
        </td>
      </tr>
      <tr v-for="(referee, i) in referees" :key="i">
        <td>{{ referee.username }}</td>
        <td>
          <input type="text" :disabled="uploading" v-model="referee.password" />
        </td>
        <td>
          <button
            v-on:click="editPassword(i)"
            :disabled="uploading || !referee.password"
          >{{ $t('generic.submit') }}</button>
        </td>
      </tr>
    </tbody>
  </table>
</template>
<script lang="ts">
import Vue from "vue";
import { request } from "@/request";
import { PreReferee } from "@/models/referee";
import { isArray } from "@/utils";
import { isString } from "lodash";
import { TranslateResult } from "vue-i18n";
export default Vue.extend({
  data: () => ({
    uploading: false,
    placeholderMessage: "" as TranslateResult,
    newUsername: "",
    newPassword: "",
    referees: [] as PreReferee[],
  }),
  props: {
    token: String,
  },
  computed: {
    allowCreation(): boolean {
      return (
        !this.uploading &&
        this.newPassword.length > 0 &&
        this.referees.find((r) => r.username == this.newUsername) === undefined
      );
    },
  },
  mounted() {
    this.placeholderMessage = this.$t("generic.loading");
    this.loadReferees();
  },
  methods: {
    async loadReferees() {
      try {
        const loaded = await request("GET", "/refereeNames");
        if (!isArray(loaded, isString)) {
          throw Error("Response not array of string");
        }
        this.referees = loaded.map((username) => ({
          username,
          password: "",
        }));
        this.placeholderMessage = "";
      } catch (why) {
        this.placeholderMessage = this.$t("generic.cannotLoad", { why });
      }
    },
    async createReferee() {
      try {
        this.uploading = true;
        await request("POST", "/referees", this.token, {
          username: this.newUsername,
          password: this.newPassword,
        });
        await this.loadReferees();
      } catch (why) {
        alert(why);
      } finally {
        this.uploading = false;
      }
    },
    async editPassword(id: number) {
      try {
        this.uploading = true;
        await request("PUT", `/referees/${id}`, this.token, {
          id,
          ...this.referees[id],
        });
        await this.loadReferees();
      } catch (why) {
        alert(why);
      } finally {
        this.uploading = false;
      }
    },
  },
});
</script>