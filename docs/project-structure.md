# SIDHKOFED Prototype Structure

## Purpose

This prototype is intentionally static and directly openable through
`index.html`. The structure keeps the current review surface simple while making
the project easier to expand into a CMS or framework later.

## Directory Layout

```text
D:\Sidhkofed-Website
|-- index.html
|-- assets/
|   `-- images/
|       `-- hero-cooperative.png
|-- src/
|   |-- css/
|   |   `-- main.css
|   `-- js/
|       `-- app.js
|-- docs/
|   |-- api-context/
|   |-- agile-backlog.md
|   |-- codex-infra-handover.md
|   |-- cms-integration-conventions.md
|   |-- sidhkofed-cms-codex-context.md
|   |-- progress-log.md
|   `-- project-structure.md
`-- README.md
```

## Conventions

- Keep `index.html` as the single static review page until the CMS/backend stack
  is selected.
- Put styling only in `src/css/main.css`.
- Put prototype behavior only in `src/js/app.js`.
- Put bitmap/static images in `assets/images/`.
- Keep sprint scope, assumptions, and review notes in `docs/agile-backlog.md`.
- Keep the full CMS scope in `docs/sidhkofed-cms-codex-context.md`.
- Keep compact future CMS model and field naming in
  `docs/cms-integration-conventions.md`.
- Keep module-based API implementation context in `docs/api-context/`.
- Keep multi-device handoff notes in `docs/progress-log.md`.
- Keep official-data gaps visible in the prototype instead of hiding them behind
  production-sounding placeholder claims.

## Future Refactor Point

When the CMS stack is selected, this structure can map cleanly into:

- templates/pages from `index.html`
- static CSS from `src/css/main.css`
- frontend behavior from `src/js/app.js`
- media/static assets from `assets/images/`
- content models informed by the prototype sections, the full CMS context, and
  `docs/agile-backlog.md`
- CMS/API names from `docs/cms-integration-conventions.md`
- module-specific API contracts from `docs/api-context/`
