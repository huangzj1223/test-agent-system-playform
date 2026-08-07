export interface TreeNodeLike {
  id: string;
  children?: TreeNodeLike[];
}

export type FlatTreeNode<T extends TreeNodeLike> = T & { depth: number };

export function flattenTree<T extends TreeNodeLike>(items: T[], depth = 0): Array<FlatTreeNode<T>> {
  return items.flatMap((item) => {
    const current = { ...item, depth } as FlatTreeNode<T>;
    const children = item.children?.length ? flattenTree(item.children as T[], depth + 1) : [];
    return [current, ...children];
  });
}
