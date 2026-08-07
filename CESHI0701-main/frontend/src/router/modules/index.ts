import { AppRouteRecord } from '@/types/router'
import { organizationTemplateRoutes } from './organization-template'
import { permissionTemplateRoutes } from './permission-template'
export const routeModules: AppRouteRecord[] = [
  organizationTemplateRoutes,
  permissionTemplateRoutes,
]
