/**
 * 通用 CRUD Mock 数据处理工具
 * 用于快速创建增删改查的 Mock 函数
 */

export interface CrudMockConfig<T = any> {
  /** 主键字段名，默认 'id' */
  idField?: keyof T | string
  /** 可搜索的字段列表 */
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

export interface CrudMockResult<T = any> {
  /** 获取列表 */
  getList: (params?: any) => { list: T[]; total: number }
  /** 添加数据 */
  add: (data: Partial<T>) => T
  /** 更新数据 */
  update: (data: Partial<T>) => T
  /** 删除数据 */
  delete: (id: any) => boolean
  /** 批量删除 */
  batchDelete: (ids: any[]) => boolean
  /** 更新状态 */
  updateStatus: (id: any, status: number) => T
  /** 获取详情 */
  getDetail: (id: any) => T | null
  /** 获取原始数据（用于调试） */
  getData: () => T[]
}

/**
 * 创建通用的 CRUD Mock 函数
 */
export function createCrudMock<T extends Record<string, any>>(
  initialData: T[],
  config: CrudMockConfig<T> = {}
): CrudMockResult<T> {
  const {
    idField = 'id',
    searchFields = [],
    sortField = 'createTime',
    isTree = false,
    childrenField = 'children'
  } = config

  const mockData: T[] = JSON.parse(JSON.stringify(initialData))
  let nextId = Math.max(...mockData.map((item) => Number(item[idField as string]) || 0)) + 1

  const flattenTree = (data: T[]): T[] => {
    const result: T[] = []
    const traverse = (items: T[]) => {
      items.forEach((item) => {
        result.push(item)
        if (item[childrenField as string]) {
          traverse(item[childrenField as string])
        }
      })
    }
    traverse(data)
    return result
  }

  const getList = (params: any = {}) => {
    const { page = 1, pageSize = 20, ...filters } = params || {}
    let filteredData = isTree ? flattenTree([...mockData]) : [...mockData]

    // 搜索过滤
    Object.keys(filters).forEach((key) => {
      const value = filters[key]
      if (value !== undefined && value !== null && value !== '') {
        if (searchFields.includes(key)) {
          filteredData = filteredData.filter((item) =>
            String(item[key]).toLowerCase().includes(String(value).toLowerCase())
          )
        } else {
          const filterValue = typeof value === 'string' ? parseInt(value) : value
          filteredData = filteredData.filter((item) => item[key] === filterValue)
        }
      }
    })

    const total = filteredData.length
    const start = (page - 1) * pageSize
    const end = start + Number(pageSize)
    const list = isTree ? mockData : filteredData.slice(start, end)

    return { list, total }
  }

  const add = (data: Partial<T>): T => {
    const newItem = {
      ...data,
      [idField]: nextId++,
      createTime: new Date().toLocaleString('zh-CN'),
      updateTime: new Date().toLocaleString('zh-CN')
    } as unknown as T
    mockData.push(newItem)
    return newItem
  }

  const update = (data: Partial<T>): T => {
    const id = data[idField as string]
    const findAndUpdate = (items: T[]): T | null => {
      for (let i = 0; i < items.length; i++) {
        if (items[i][idField as string] === id) {
          items[i] = {
            ...items[i],
            ...data,
            updateTime: new Date().toLocaleString('zh-CN')
          }
          return items[i]
        }
        if (isTree && items[i][childrenField as string]) {
          const found = findAndUpdate(items[i][childrenField as string])
          if (found) return found
        }
      }
      return null
    }
    const updated = findAndUpdate(mockData)
    if (!updated) throw new Error('数据不存在')
    return updated
  }

  const deleteItem = (id: any): boolean => {
    const findAndDelete = (items: T[], parentArray?: T[]): boolean => {
      for (let i = 0; i < items.length; i++) {
        if (items[i][idField as string] === id) {
          items.splice(i, 1)
          return true
        }
        if (isTree && items[i][childrenField as string]) {
          if (findAndDelete(items[i][childrenField as string], items)) {
            return true
          }
        }
      }
      return false
    }
    return findAndDelete(mockData)
  }

  const batchDelete = (ids: any[]): boolean => {
    ids.forEach((id) => deleteItem(id))
    return true
  }

  const updateStatus = (id: any, status: number): T => {
    return update({ [idField]: id, status } as unknown as Partial<T>)
  }

  const getDetail = (id: any): T | null => {
    const findById = (items: T[]): T | null => {
      for (const item of items) {
        if (item[idField as string] === id) return item
        if (isTree && item[childrenField as string]) {
          const found = findById(item[childrenField as string])
          if (found) return found
        }
      }
      return null
    }
    return findById(mockData)
  }

  const getData = () => mockData

  return {
    getList,
    add,
    update,
    delete: deleteItem,
    batchDelete,
    updateStatus,
    getDetail,
    getData
  }
}
