/**
 * Reusable relationship pickers (Phase 15.3). The shared "link surface" every content
 * module composes — bounded master-data options, the server-side searchable relation
 * picker, the media picker dialog, and the RHF-bound cover-image field. Built once here
 * so no module duplicates link logic.
 *
 * `useMasterOptions` loads bounded reference lists (event-types, districts, commodities…)
 * eagerly — correct for small dropdowns. Large CONTENT relations
 * (programmes/institutions/galleries/documents/events) use the paginated, server-side
 * {@link RelationPicker} instead of loading every row (Phase 15.3 remediation — Finding 4).
 */
export { useMasterOptions, type OptionsResult } from './use-options';
export {
  useFinancialYearOptions,
  useReportingPeriodOptions,
  periodTypeLabel,
} from './period-pickers';
export {
  useRelationSearch,
  relationLabel,
  RELATION_PAGE_SIZE,
  type RelationRecord,
  type RelationOption,
} from './relation-search';
export { RelationPicker, type RelationPickerProps } from './relation-picker';
export {
  RelationMultiSelectField,
  RelationSelect,
  toRelationValue,
  type RelationSelectProps,
} from './relation-fields';
export { useMediaList, uploadMedia, type MediaItem } from './media-api';
export { MediaPickerDialog, type MediaPickerDialogProps } from './media-picker-dialog';
export { CoverMediaField, type CoverMediaFieldProps } from './cover-media-field';
