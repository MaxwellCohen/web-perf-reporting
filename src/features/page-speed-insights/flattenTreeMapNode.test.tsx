import { describe, expect, it } from 'vitest';
import { flattenTreeMapNode } from '@/features/page-speed-insights/flattenTreeMapNode';
import type { TreeMapNode } from '@/lib/schema';

describe('flattenTreeMapNode', () => {
  it('returns object with empty children when input has no children', () => {
    const node: TreeMapNode = {
      name: 'root',
      resourceBytes: 100,
    };

    const result = flattenTreeMapNode(node);

    expect(result).toEqual({
      name: 'root',
      resourceBytes: 100,
      children: [],
    });
  });

  it('flattens nested children with path prefixes', () => {
    const node: TreeMapNode = {
      name: 'root',
      resourceBytes: 500,
      children: [
        {
          name: 'scripts',
          resourceBytes: 200,
          children: [
            {
              name: 'main.js',
              resourceBytes: 150,
            },
            {
              name: 'vendor.js',
              resourceBytes: 50,
            },
          ],
        },
        {
          name: 'styles',
          resourceBytes: 100,
          children: [
            {
              name: 'app.css',
              resourceBytes: 100,
            },
          ],
        },
      ],
    };

    const result = flattenTreeMapNode(node);

    expect(result.children).toHaveLength(3);
    expect(result.children?.map((c) => c.name)).toEqual([
      'scripts/main.js',
      'scripts/vendor.js',
      'styles/app.css',
    ]);
  });

  it('preserves leaf nodes without nested children', () => {
    const node: TreeMapNode = {
      name: 'root',
      resourceBytes: 100,
      children: [
        {
          name: 'file.js',
          resourceBytes: 100,
        },
      ],
    };

    const result = flattenTreeMapNode(node);

    expect(result.children).toHaveLength(1);
    expect(result.children?.[0]).toEqual({
      name: 'file.js',
      resourceBytes: 100,
    });
  });

  it('handles undefined children', () => {
    const node: TreeMapNode = {
      name: 'root',
      resourceBytes: 100,
    };

    const result = flattenTreeMapNode(node);

    expect(result.children).toEqual([]);
  });

  it('handles deeply nested structure', () => {
    const node: TreeMapNode = {
      name: 'a',
      resourceBytes: 100,
      children: [
        {
          name: 'b',
          resourceBytes: 50,
          children: [
            {
              name: 'c',
              resourceBytes: 25,
            },
          ],
        },
      ],
    };

    const result = flattenTreeMapNode(node);

    // Root "a" children are flattened; "b/c" is the path for c under b
    expect(result.children?.[0]?.name).toBe('b/c');
  });
});
