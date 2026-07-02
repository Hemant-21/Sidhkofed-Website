# `features/` — module vertical slices

Each future CMS module gets one folder here (e.g. `features/events/`,
`features/documents/`). A feature composes the **foundation** — it never
re-implements layout, auth, API, tables, forms, or dialogs.

Recommended shape:

```text
features/<module>/
├── api.ts          # createResourceApi<Summary, Detail, CreateDto>('<module>')
├── queries.ts      # React Query hooks built on api.ts + queryKeys.resource('<module>')
├── schema.ts       # Zod schemas (compose lib/validation primitives)
├── columns.tsx     # ColumnDef<Row>[] for the DataTable
├── components/
│   ├── <module>-form.tsx     # <Form> + field components
│   └── <module>-list.tsx     # <DataTable> + <Pagination> + filters
└── index.ts
```

A list page becomes: `useDataTable()` + a `useQuery` over `api.list()` +
`<DataTable>` + `<Pagination>`. A create/edit page becomes: `useZodForm(schema)` +
`<Form>` + field components + the resource mutation. Lifecycle buttons use
`<Can permission="...">` + `useConfirmDialog()`.

The only feature shipped in the foundation is `auth/` (the login form), included to
exercise the full stack end-to-end.
