import { AppRouteRecord } from '@/types/router'

export const exceptionRoutes: AppRouteRecord = {
  path: '/exception',
  name: 'Exception',
  component: () => import('@/views/index/index.vue'),
  meta: {
    title: 'menus.exception.title',
    icon: 'Warning'
  },
  children: [
    {
      path: '403',
      name: 'Exception403',
      component: () => import('@/views/exception/403/index.vue'),
      meta: {
        title: 'menus.exception.forbidden',
        keepAlive: true,
        isHideTab: true,
        isFullPage: true
      }
    },
    {
      path: '404',
      name: 'Exception404',
      component: () => import('@/views/exception/404/index.vue'),
      meta: {
        title: 'menus.exception.notFound',
        keepAlive: true,
        isHideTab: true,
        isFullPage: true
      }
    },
    {
      path: '500',
      name: 'Exception500',
      component: () => import('@/views/exception/500/index.vue'),
      meta: {
        title: 'menus.exception.serverError',
        keepAlive: true,
        isHideTab: true,
        isFullPage: true
      }
    }
  ]
}
