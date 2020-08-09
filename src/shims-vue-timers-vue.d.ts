/**
 * Augment the typings of Vue.js
 */

import Vue from 'vue'
import { TimerObject } from 'vue-timers'

declare module 'vue/types/options' {
  interface ComponentOptions<V extends Vue> {
    timers?: Record<string, TimerObject>;
  }
}