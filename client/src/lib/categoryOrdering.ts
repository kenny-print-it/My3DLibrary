export type CategoryGroup<TCategory extends { id: number; isPinned?: boolean }, TModel> = {
  category: TCategory;
  models: TModel[];
};

export function sortCollectionGroups<TCategory extends { id: number; isPinned?: boolean }, TModel>(
  groups: CategoryGroup<TCategory, TModel>[],
): CategoryGroup<TCategory, TModel>[] {
  return [...groups].sort((left, right) => {
    const pinDifference = Number(Boolean(right.category.isPinned)) - Number(Boolean(left.category.isPinned));
    if (pinDifference !== 0) return pinDifference;
    return 0;
  });
}
