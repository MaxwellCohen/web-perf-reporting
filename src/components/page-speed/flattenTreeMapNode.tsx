'use client';
import { TreeMapNode } from '@/lib/schema';

export function flattenTreeMapNode(obj: TreeMapNode) {
  const transformChildren = (children: TreeMapNode[], prefix = '') => {
    if (!children) {
      return [];
    }

    return children.reduce((acc, child: TreeMapNode) => {
      const { children: nestedChildren, name } = child;
      const newPrefix = prefix ? `${prefix}/${name}` : name;
      if (nestedChildren && Array.isArray(nestedChildren)) {
        transformChildren(nestedChildren, newPrefix).forEach(
          (transformedChild) => {
            acc.push(transformedChild);
          }
        );
      } else if (prefix) {
        acc.push({
          ...child,
          name: newPrefix,
        });
      } else {
        acc.push(child);
      }

      return acc;
    }, [] as TreeMapNode[]);
  };

  const newChildren = transformChildren(obj.children || []);

  return {
    ...obj,
    children: newChildren,
  };
}
