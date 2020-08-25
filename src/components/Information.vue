<template>
  <v-card dark class="information">
    <v-card-title dark>
      <span v-if="readOnly">{{ name }}</span>
      <v-text-field v-else :label="$t('information.name')" v-model="name" />
    </v-card-title>
    <v-card-subtitle>{{$t('information.organizer')}}</v-card-subtitle>
    <v-card-text>{{ refereeNames.get(value.organizer) || "?" }}</v-card-text>
    <v-card-subtitle>{{$t('information.date')}}</v-card-subtitle>
    <v-card-text>
      <template v-if="readOnly">{{ $d(tournamentDate) }}</template>
      <template v-else>
        <input type="date" v-model="date" />
        <input type="time" v-model="time" />
      </template>
    </v-card-text>
    <v-card-text v-if="readOnly">{{ description }}</v-card-text>
    <template v-else>
      <v-card-subtitle>{{ $t('information.description') }}</v-card-subtitle>
      <v-textarea v-model="description"></v-textarea>
    </template>
    <v-card-subtitle>{{$t('information.referees')}}</v-card-subtitle>
    <v-card-text class="information-value">{{ referees.join(' ') }}</v-card-text>
  </v-card>
</template>
<script lang="ts">
import Vue from "vue";
import { Information } from "@/models/setup";
import isString from "lodash/isString";
import isEqual from "lodash/isEqual";
import { loadReferees } from "@/request";

export default Vue.extend({
  props: {
    value: Object as () => Information,
    readOnly: {
      type: Boolean,
      default: false,
    },
  },
  data: () => ({
    refereeNames: new Map<number, string>(),
  }),
  watch: {
    // load referees list again if information.referees has changed
    value: {
      deep: true,
      immediate: true,
      async handler(val: Information, oldVal?: Information) {
        if (!isEqual(val.referees, oldVal?.referees)) {
          this.refereeNames = await loadReferees();
        }
      },
    },
  },
  methods: {
    update<K extends keyof Information>(part: Pick<Information, K>) {
      this.$emit("input", { ...this.value, ...part });
    },
  },
  computed: {
    name: {
      get(): string {
        return this.value.name;
      },
      set(name: string) {
        this.update({ name });
      },
    },
    description: {
      get(): string {
        return this.value.description;
      },
      set(description: string) {
        this.update({ description });
      },
    },
    referees: {
      get(): string[] {
        return [this.value.organizer, ...this.value.referees]
          .map((id) => this.refereeNames.get(id) ?? "?")
          .filter(isString);
      },
      set(list: string[]) {
        const newList = Array.from(this.refereeNames.entries())
          .filter(([, name]) => {
            list.includes(name);
          })
          .map(([id]) => id);
        this.update({ referees: newList });
      },
    },
    tournamentDate: {
      get(): Date {
        return new Date(this.value.tournamentDate * 1000);
      },
      set(value: Date) {
        this.update({ tournamentDate: Math.floor(value.valueOf() / 1000) });
      },
    },
    date: {
      get(): string {
        return [
          this.tournamentDate.getFullYear(),
          this.tournamentDate.getMonth() + 1,
          this.tournamentDate.getDate(),
        ]
          .map((n) => `${n}`.padStart(2, "0"))
          .join("-");
      },
      set(value: string) {
        const date = new Date(this.tournamentDate.valueOf());
        const values = value.split("-").map((s) => parseInt(s, 10)) as [
          number,
          number,
          number
        ];
        values[1] -= 1;
        date.setFullYear(...values);
        this.tournamentDate = date;
      },
    },
    time: {
      get(): string {
        return [
          this.tournamentDate.getHours(),
          this.tournamentDate.getMinutes(),
        ]
          .map((n) => `${n}`.padStart(2, "0"))
          .join(":");
      },
      set(value: string) {
        const date = new Date(this.tournamentDate.valueOf());
        const values = value.split(":").map((s) => parseInt(s, 10)) as [
          number,
          number
        ];
        date.setHours(...values);
        this.tournamentDate = date;
      },
    }
  },
});
</script>