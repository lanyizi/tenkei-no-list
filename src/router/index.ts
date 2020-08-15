import Vue from 'vue'
import VueRouter, { RouteConfig } from 'vue-router'
import Home from '../views/Home.vue'
import New from '@/views/New.vue'
import Tournament from "@/views/Tournament.vue"
import Settings from "@/views/Settings.vue"
import Referees from "@/views/Referees.vue"

Vue.use(VueRouter)

const routes: Array<RouteConfig> = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/new',
    name: 'New',
    component: New
  },
  {
    path: '/:id(\\d+)',
    name: 'Tournament',
    component: Tournament,
    props: true
  },
  {
    path: '/settings/:id(\\d+)',
    name: 'Settings',
    component: Settings,
    props: true
  },
  {
    path: '/referees',
    name: 'Referees',
    component: Referees
  },
  {
    path: '/about',
    name: 'About',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "about" */ '../views/About.vue')
  }
]

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
})

export default router
