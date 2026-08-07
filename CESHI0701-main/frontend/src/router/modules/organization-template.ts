import { AppRouteRecord } from '@/types/router'

/**
 * 组织管理路由
 * 包含：部门管理、人员管理、岗位管理
 */
export const organizationTemplateRoutes: AppRouteRecord = {
  path: '/organization-template',
  name: 'OrganizationTemplate',
  component: () => import('@/views/index/index.vue'),
  meta: {
    title: 'menus.organizationTemplate.title',
    icon: 'OfficeBuilding',
    isFirstLevel: true
  },
  children: [
    {
      path: '',
      name: 'OrganizationTemplateIndex',
      component: () => import('@/views/organization/department/index.vue'),
      meta: {
        title: 'menus.organizationTemplate.title',
        keepAlive: true,
        isHide: true
      }
    },
    {
      path: 'department',
      name: 'OrganizationTemplateDepartment',
      component: () => import('@/views/organization/department/index.vue'),
      meta: {
        title: 'menus.organizationTemplate.department',
        keepAlive: true
      }
    },
    {
      path: 'user',
      name: 'OrganizationTemplateUser',
      component: () => import('@/views/organization/user/index.vue'),
      meta: {
        title: 'menus.organizationTemplate.user',
        keepAlive: true
      }
    },
    {
      path: 'position',
      name: 'OrganizationTemplatePosition',
      component: () => import('@/views/organization/position/index.vue'),
      meta: {
        title: 'menus.organizationTemplate.position',
        keepAlive: true
      }
    }
  ]
}
