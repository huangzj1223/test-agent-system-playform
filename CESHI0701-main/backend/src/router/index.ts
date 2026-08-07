import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: () => import('@/components/layout/DefaultLayout.vue'),
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('@/views/home/index.vue'),
        },
        {
          path: 'product',
          name: 'product',
          component: () => import('@/views/product/index.vue'),
        },
        {
          path: 'pricing',
          name: 'pricing',
          component: () => import('@/views/pricing/index.vue'),
        },
        {
          path: 'about',
          name: 'about',
          component: () => import('@/views/about/index.vue'),
        },
        {
          path: 'contact',
          name: 'contact',
          component: () => import('@/views/contact/index.vue'),
        },
      ],
    },
  ],
  scrollBehavior(_, __, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0, behavior: 'smooth' }
  },
})

export default router
