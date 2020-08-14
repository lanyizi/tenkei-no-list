<template>
  <div>
    <div v-if="placeholderMessage != null">{{ placeholderMessage }}</div>
    <div v-else>
      <span v-if="processed.type === 'preview'">{{ $t('bracket.isPreview') }}</span>
      <div
        v-if="processed.type === 'previewError'"
      >{{ $t('bracket.cannotDisplay', { why: processed.why }) }}</div>
      <Brackets v-else :token="token" :tournament-id="id" :model="processed.data" @refresh-requested="loadTournament" />
      <Information :value="model.information" :referee-names="refereeNames" />
    </div>
  </div>
</template>
<script lang="ts">
import Vue from "vue";
import { Setup, createSetup } from "@/models/setup";
import { Tournament, createFromSetup } from "@/models/tournament";
import { isTournament } from "@/models/tournament";
import Brackets from "@/components/Brackets.vue";
import Information from "@/components/Information.vue";
import { TranslateResult } from "vue-i18n";
import { loadTournament } from "@/request";

type Processed =
  | {
      type: "model";
      data: Tournament;
    }
  | {
      type: "preview";
      data: Tournament;
    }
  | {
      type: "previewError";
      why: unknown;
    };

export default Vue.extend({
  components: {
    Brackets,
    Information,
  },
  props: {
    refereeNames: Array as () => string[],
    id: String,
    token: String,
  },
  data: () => ({
    model: createSetup(-1) as Setup | Tournament,
    placeholderMessage: null as TranslateResult | null,
  }),
  watch: {
    id: {
      immediate: true,
      handler() {
        this.initialize();
      },
    },
  },
  timers: {
    loadTournament: {
      time: 10_000,
      repeat: true,
      autostart: true,
    },
  },
  methods: {
    initialize() {
      this.placeholderMessage = this.$t("generic.loading");
      this.loadTournament();
    },
    async loadTournament() {
      try {
        this.model = await loadTournament(this.id);
        this.placeholderMessage = null;
      } catch (why) {
        this.placeholderMessage = this.$t("generic.cannotLoad", { why });
      }
    },
  },
  computed: {
    processed(): Processed {
      if (isTournament(this.model)) {
        return { type: "model", data: this.model };
      }
      try {
        return { type: "preview", data: createFromSetup(this.model) };
      } catch (why) {
        return { type: "previewError", why };
      }
    },
  },
});
</script>