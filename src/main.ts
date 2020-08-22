import Vue from 'vue'
import i18n from './i18n'
import router from './router'
import vuetify from './plugins/vuetify';
import VueTimer from 'vue-timers'
import VueStickyDirective from 'vue-sticky-directive'
import VueWindowSize from 'vue-window-size'
import App from './App.vue'

Vue.config.productionTip = false
Vue.use(VueTimer)
Vue.use(VueStickyDirective)
Vue.use(VueWindowSize)

new Vue({
  render: h => h(App),
  router,
  vuetify,
  i18n
}).$mount('#app')
