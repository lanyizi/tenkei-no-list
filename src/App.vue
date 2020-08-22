<template>
  <v-app>
    <v-app-bar app color="secondary" :height="headerHeight" class="lanyi-titlebar">
      <div class="d-flex align-center">
        <router-link to="/">
          <v-img
            alt="Vuetify Logo"
            class="shrink mr-2"
            contain
            :src="require('@/assets/main/title/T_titlelogo.png')"
            transition="scale-transition"
            :height="headerHeight"
          />
        </router-link>
        <v-btn
          dark
          text
          v-for="({ name, to, exact, hideOnPhone }, i) in routes"
          :key="i"
          :to="to"
          :exact="exact"
          :class="{ 'hidden-sm-and-down': hideOnPhone != false }"
        >{{ name }}</v-btn>
      </div>
      <v-spacer></v-spacer>
      <div class="d-flex align-center">
        <Auth v-model="user" @token="token = $event"></Auth>
        <v-btn
          v-if="user === 0"
          class="hidden-sm-and-down"
          dark
          text
          to="/referees"
        >{{ $t('auth.manageReferee') }}</v-btn>
        <v-btn dark text to="/new">{{ $t('createTournament') }}</v-btn>
      </div>
    </v-app-bar>

    <v-main class="lanyi-main" :class="mainClass" :style="backgroundSizeStyle">
      <router-view :user="user" :token="token" />
    </v-main>
  </v-app>
</template>

<script lang="ts">
import Vue from "vue";
import Auth from "@/components/Auth.vue";
import { TranslateResult } from "vue-i18n";
import { Location } from "vue-router";

type RouterData = {
  name: TranslateResult;
  to: Location;
  exact?: true;
  hideOnPhone?: false;
};

export const headerHeight = 72;

export default Vue.extend({
  components: {
    Auth,
  },
  data: () => ({
    user: -1,
    token: "",
  }),
  computed: {
    headerHeight(): number {
      return headerHeight;
    },
    backgroundSizeStyle(): Record<string, string> {
      return { backgroundPosition: `0 ${this.headerHeight}px` }
    },
    mainClass(): string {
      return `lanyi-main-${(this.$route.name || "default").toLowerCase()}`;
    },
    routes(): RouterData[] {
      const routes: RouterData[] = [
        {
          name: this.$t("home"),
          to: { name: "Home" },
          exact: true,
        },
      ];
      if (this.$route.params.id) {
        const params = { id: this.$route.params.id };
        routes.push({
          name: this.$t("bracket.title"),
          to: { name: "Tournament", params },
        });
        if (this.user > -1) {
          routes.push({
            name: this.$t("tournamentSetup.title"),
            to: { name: "Settings", params },
            hideOnPhone: false,
          });
        }
      }
      //routes.push({ name: this.$t("about"), to: { name: "About" } });
      return routes;
    },
  },
});
</script>
<style scoped>
.lanyi-titlebar {
  background: url("~@/assets/main/title/T_titlebar.png");
}
.lanyi-main {
  background-attachment: fixed;
  background-size: cover;
}
.lanyi-main-tournament {
  background-image: url('~@/assets/main/mid/M_.png');
}
</style>
