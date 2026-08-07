# CRUD 工具使用文档

通用的增删改查工具，用于快速创建 Mock 数据和 API 函数，减少 80% 的重复代码。

## 快速开始

### 1. 创建 Mock 数据

```typescript
// src/mock/product.ts
import { createCrudMock } from '@/utils/crud'
import type { Product } from '@/types/product'

// 初始数据
const mockProducts: Product[] = [
  { id: 1, name: '产品A', price: 100, status: 1, createTime: '2024-01-01 10:00:00' },
  { id: 2, name: '产品B', price: 200, status: 1, createTime: '2024-01-02 10:00:00' }
]

// 创建 CRUD Mock 函数（只需 3 行代码）
export const productMock = createCrudMock(mockProducts, {
  searchFields: ['name'],  // 可搜索的字段
  sortField: 'createTime'  // 排序字段
})
```

### 2. 创建 API 函数

```typescript
// src/api/product.ts
import { createCrudApi } from '@/utils/crud'
import { productMock } from '@/mock/product'
import type { Product } from '@/types/product'

// 创建 CRUD API 函数（只需 3 行代码）
export const productApi = createCrudApi<Product>({
  baseUrl: '/admin/product',
  mockFns: productMock
})

// 自动生成以下方法：
// - productApi.getList(params)
// - productApi.add(data)
// - productApi.update(data)
// - productApi.delete(id)
// - productApi.batchDelete(ids)
// - productApi.updateStatus(id, status)
// - productApi.getDetail(id)
```

### 3. 在页面中使用

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { productApi } from '@/api/product'
import { ElMessage } from 'element-plus'

const tableData = ref([])
const total = ref(0)
const loading = ref(false)
const queryParams = ref({
  name: '',
  status: null,
  page: 1,
  pageSize: 20
})

// 获取列表
const getList = async () => {
  loading.value = true
  try {
    const res = await productApi.getList(queryParams.value)
    tableData.value = res.data.list
    total.value = res.data.total
  } finally {
    loading.value = false
  }
}

// 添加
const handleAdd = async (data) => {
  await productApi.add(data)
  ElMessage.success('添加成功')
  getList()
}

// 更新
const handleUpdate = async (data) => {
  await productApi.update(data)
  ElMessage.success('更新成功')
  getList()
}

// 删除
const handleDelete = async (id) => {
  await productApi.delete(id)
  ElMessage.success('删除成功')
  getList()
}

onMounted(() => {
  getList()
})
</script>
```

## 配置选项

### CrudMockConfig

```typescript
interface CrudMockConfig<T> {
  /** 主键字段名，默认 'id' */
  idField?: keyof T | string

  /** 可搜索的字段列表（模糊搜索） */
  searchFields?: (keyof T | string)[]

  /** 排序字段，默认 'createTime' */
  sortField?: keyof T | string

  /** 是否为树形数据 */
  isTree?: boolean

  /** 子节点字段名，默认 'children' */
  childrenField?: keyof T | string

  /** 父节点字段名，默认 'parentId' */
  parentField?: keyof T | string
}
```

### CrudApiConfig

```typescript
interface CrudApiConfig {
  /** API 基础路径，如 '/admin/product' */
  baseUrl: string

  /** Mock 函数集合 */
  mockFns: CrudMockResult<any>

  /** 是否使用 Mock，默认从环境变量读取 */
  useMock?: boolean

  /** Mock 延迟时间（毫秒），默认 300 */
  mockDelay?: number
}
```

## 高级用法

### 树形数据

```typescript
// Mock 树形数据
const mockDepartments = [
  {
    id: 1,
    name: '总公司',
    parentId: null,
    children: [
      { id: 2, name: '技术部', parentId: 1 },
      { id: 3, name: '市场部', parentId: 1 }
    ]
  }
]

export const departmentMock = createCrudMock(mockDepartments, {
  isTree: true,
  searchFields: ['name']
})
```

### 自定义字段名

```typescript
export const customMock = createCrudMock(mockData, {
  idField: 'uid',           // 自定义主键字段
  childrenField: 'subItems', // 自定义子节点字段
  parentField: 'pid'         // 自定义父节点字段
})
```

### 获取原始数据（调试用）

```typescript
const mock = createCrudMock(mockData)
console.log(mock.getData())  // 查看当前所有数据
```

## 效果对比

### 传统方式（需要 200+ 行代码）

```typescript
// mock/product.ts - 100+ 行
let mockProducts = [...]
export function getProductListMock(params) {
  // 筛选逻辑 20 行
  // 分页逻辑 10 行
  // 返回数据 5 行
}
export function addProductMock(data) { /* 10 行 */ }
export function updateProductMock(data) { /* 15 行 */ }
export function deleteProductMock(id) { /* 10 行 */ }
// ... 更多函数

// api/product.ts - 100+ 行
export function getProductList(params) {
  if (USE_MOCK) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ code: 200, data: getProductListMock(params) })
      }, 300)
    })
  }
  return request.get({ url: '/admin/product/list', params })
}
// ... 更多函数
```

### 使用工具后（只需 10 行代码）

```typescript
// mock/product.ts - 5 行
import { createCrudMock } from '@/utils/crud'
const mockProducts = [...]
export const productMock = createCrudMock(mockProducts, {
  searchFields: ['name']
})

// api/product.ts - 5 行
import { createCrudApi } from '@/utils/crud'
import { productMock } from '@/mock/product'
export const productApi = createCrudApi({
  baseUrl: '/admin/product',
  mockFns: productMock
})
```

**代码量减少 95%，开发时间从 2 小时缩短到 10 分钟！**

## 注意事项

1. **类型定义**：建议为数据定义 TypeScript 类型
2. **字段命名**：默认使用 `id`、`createTime`、`updateTime` 字段
3. **Mock 模式**：通过 `.env` 中的 `VITE_USE_MOCK` 控制
4. **数据持久化**：Mock 数据在内存中，刷新页面会重置

## 常见问题

### Q: 如何添加自定义方法？

A: 可以在创建后扩展：

```typescript
export const productApi = {
  ...createCrudApi({ baseUrl: '/admin/product', mockFns: productMock }),
  // 添加自定义方法
  export: (ids: number[]) => {
    return request.post({ url: '/admin/product/export', data: { ids } })
  }
}
```

### Q: 如何处理复杂的筛选逻辑？

A: 可以在 Mock 函数中自定义：

```typescript
const mock = createCrudMock(mockData, { searchFields: ['name'] })

// 自定义 getList 方法
const originalGetList = mock.getList
mock.getList = (params) => {
  // 添加自定义筛选逻辑
  const result = originalGetList(params)
  // 进一步处理 result
  return result
}
```

### Q: 支持哪些数据库操作？

A: 目前支持：
- ✅ 列表查询（分页、筛选、搜索）
- ✅ 添加
- ✅ 更新
- ✅ 删除
- ✅ 批量删除
- ✅ 状态更新
- ✅ 详情查询
- ✅ 树形数据

## 更多示例

查看项目中的实际使用案例：
- `src/mock/example.ts`
- `src/api/example.ts`
