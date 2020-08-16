<template>
  <div class="information">
    <h3>
      <span v-if="readOnly">{{ name }}</span>
      <input v-else type="text" :placeholder="$t('information.name')" v-model="name" />
    </h3>
    <span class="information-entry">
      <span class="information-key">{{$t('information.organizer')}}</span>
      <span class="information-value">{{ refereeNames[value.organizer] }}</span>
    </span>
    <span class="information-entry">
      <span class="information-key">{{$t('information.date')}}</span>
      <span v-if="readOnly" class="information-value">{{ $d(tournamentDate) }}</span>
      <span v-else>
        <input type="date" v-model="date" />
        <input type="time" v-model="time" />
      </span>
    </span>
    <p v-if="readOnly">{{ description }}</p>
    <div v-else>
      <h4>{{ $t('information.description') }}</h4>
      <textarea v-model="description"></textarea>
    </div>
    <span class="information-entry">
      <span class="information-key">{{$t('information.referees')}}</span>
      <span class="information-value">{{ referees.join(' ') }}</span>
    </span>
  </div>
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
  },
  data: () => ({
    readOnly: false,
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
    update<K extends keyof Information>(key: K, value: Information[K]) {
      this.$emit("input", { ...this.value, [key]: value });
    },
  },
  computed: {
    name: {
      get(): string {
        return this.value.name;
      },
      set(value: string) {
        this.update("name", value);
      },
    },
    description: {
      get(): string {
        return this.value.description;
      },
      set(value: string) {
        this.update("description", value);
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
        this.update("referees", newList);
      },
    },
    tournamentDate: {
      get(): Date {
        return new Date(this.value.tournamentDate * 1000);
      },
      set(value: Date) {
        this.update("tournamentDate", Math.floor(value.valueOf() / 1000));
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
    },
  },
});
</script>