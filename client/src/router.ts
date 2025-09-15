import { createRouter, createWebHistory } from 'vue-router'
import SenderView from './views/SenderView.vue'
import ViewerView from './views/ViewerView.vue'

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/viewer' },
    { path: '/sender', component: SenderView },
    { path: '/viewer', component: ViewerView },
  ],
})
