# Training Types removed

Migration `20260915140000_remove_training_types` removes the Training Types master,
the event training-type field, and programme permitted-training-type relationships.
Events and programmes retain their IDs and other relationships.

The event and programme APIs no longer accept or return `training_type_id`,
`training_type`, `permitted_training_type_ids`, or `permitted_training_types`.
The `training-types` master endpoint is no longer registered. Older API documents
describing these fields are superseded by this change.

Training attendance reports now include all event types whose parent category has
the stable slug `trainings` (display name: Capacity Building & Exposure Visits).
The report retains its publication, completion, date, and location rules. It no
longer supports a training-type filter. Both measures use calculation version 2.
Existing metric filters are cleaned by the migration and prior training snapshots
are flagged for review rather than recalculated or overwritten.

The CMS and public programme pages no longer expose the removed classification.
Seeds no longer create or reference it. Local pre-migration exports are stored in
`artifacts/master-data/training-type-removal-backup.json` and
`artifacts/master-data/training-metrics-before-removal.json`.
