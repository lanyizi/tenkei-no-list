<template>
  <div>
    <div v-if="placeholderMessage != null">{{ placeholderMessage }}</div>
    <div v-else>
      <span v-if="processed.type === 'preview'">{{ $t('bracket.isPreview') }}</span>
      <div
        v-if="processed.type === 'previewError'"
      >{{ $t('bracket.cannotDisplay', { why: processed.why }) }}</div>
      <div v-else class="lanyi-brackets-container">
        <Brackets
          :token="token"
          :tournament-id="id"
          :model="processed.data"
          @refresh-requested="loadTournament"
        />
      </div>
      <Information read-only :value="model.information" />
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
import { WithID } from "@/models/validations";

type Processed =
  | {
      type: "model" | "preview";
      data: WithID<Tournament>;
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
    id: Number,
    token: String,
  },
  data() {
    return {
      model: {
        id: this.id,
        ...createSetup(-1),
      } as WithID<Setup | Tournament>,
      placeholderMessage: null as TranslateResult | null,
    };
  },
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
        return {
          type: "preview",
          data: { id: this.id, ...createFromSetup(this.model) },
        };
      } catch (why) {
        return { type: "previewError", why };
      }
    },
  },
});
</script>
<style lang="css" scoped>
.lanyi-brackets-container {
  width: 100%;
  overflow: auto;
}
</style>