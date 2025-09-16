import type { IResourcesItem } from "../../../../types/ResourcesItemTypes";

export const UTIL_SORT_SOURCES = (
  items: IResourcesItem[],
  direction: 'asc' | 'desc' = 'asc',
  isRoot: boolean = true
): IResourcesItem[] => {
  const compare = (a: string, b: string) =>
    direction === 'asc' ? a.localeCompare(b) : b.localeCompare(a);

  const sorted = items.map(item => ({
    ...item,
    subDirectory: item.subDirectory
      ? UTIL_SORT_SOURCES(item.subDirectory, direction, false)
      : undefined,
  }));

  if (isRoot) {
    return sorted;
  }

  return sorted.sort((a, b) => {
    const isAFolder = a.icon === 'Folder';
    const isBFolder = b.icon === 'Folder';

    if (isAFolder && !isBFolder) return -1;
    if (!isAFolder && isBFolder) return 1;

    return compare(a.label, b.label);
  });
};
