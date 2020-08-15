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
      <span class="information-value">{{ refereeNames.join(' ') }}</span>
    </span>
  </div>
</template>
<script lang="ts">
import Vue from "vue";
import { Information } from "@/models/setup";

export default Vue.extend({
  props: {
    value: Object as () => Information,
    refereeNames: Array as () => string[],
  },
  data: () => ({
    readOnly: false,
  }),
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
        return [this.value.organizer, ...this.value.referees].map(
          (i) => this.refereeNames[i]
        );
      },
      set(list: string[]) {
        const newList = list
          .map((n) => this.refereeNames.indexOf(n))
          .filter((i) => i !== -1 && i !== this.value.organizer);
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