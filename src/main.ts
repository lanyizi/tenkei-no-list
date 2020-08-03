import Vue from 'vue'
import VueI18n from 'vue-i18n'
import App from './App.vue'
import i18n from './i18n'

Vue.use(VueI18n);
Vue.config.productionTip = false

new Vue({
  render: h => h(App),
  i18n
}).$mount('#app')
