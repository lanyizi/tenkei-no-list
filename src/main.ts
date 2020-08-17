import Vue from 'vue'
import App from './App.vue'
import i18n from './i18n'
import router from './router'
import VueTimer from 'vue-timers'
import vuetify from './plugins/vuetify';

Vue.config.productionTip = false
Vue.use(VueTimer)

new Vue({
  render: h => h(App),
  router,
  vuetify,
  i18n
}).$mount('#app')
