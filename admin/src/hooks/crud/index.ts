/**
 * Reusable CRUD hook layer (Phase 15.1). These compose the API client factory,
 * the query-key namespace, cache helpers, and toast/dialog providers into the
 * standard data-access hooks every future module page reuses — so a module's data
 * layer is a few lines, not a rewrite.
 */

export { useResourceApi } from './use-resource-api';
export { useCrudList, type UseCrudListOptions } from './use-crud-list';
export { useCrudDetail, type UseCrudDetailOptions } from './use-crud-detail';
export { useCrudCreate } from './use-crud-create';
export { useCrudUpdate, type UpdateVars } from './use-crud-update';
export { useCrudDelete } from './use-crud-delete';
export {
  usePublish,
  useUnpublish,
  useArchive,
  useRestore,
  useLifecycleActions,
} from './use-lifecycle';
export { useBulkAction, type UseBulkActionApi, type UseBulkActionOptions } from './use-bulk-action';
export { useFilters, type UseFiltersOptions } from './use-filters';
export { useCrudSearch, type UseCrudSearchOptions } from './use-crud-search';
export type { CrudMutationOptions } from './crud-mutation-options';
