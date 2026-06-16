# ERD – Asset Management (Mermaid)

This ERD is derived from the repository SQL schema (db/dbv20.sql, db/all_migrations_combined.sql) and canonical backups (db/backups/dbv100, db/dblive3v2.11-5-14-26). It focuses on primary keys, foreign keys, and core business fields.

## Full System ERD (Paginated for PDF)

<div class="erd-multipage">
  <div class="erd-slice"><img src="./erd-full-system.svg" style="top:0mm" /></div>
  <div class="erd-slice"><img src="./erd-full-system.svg" style="top:-240mm" /></div>
  <div class="erd-slice"><img src="./erd-full-system.svg" style="top:-480mm" /></div>
  <div class="erd-slice"><img src="./erd-full-system.svg" style="top:-720mm" /></div>
  <div class="erd-slice"><img src="./erd-full-system.svg" style="top:-960mm" /></div>
  <div class="erd-slice"><img src="./erd-full-system.svg" style="top:-1200mm" /></div>
  <div class="erd-slice"><img src="./erd-full-system.svg" style="top:-1440mm" /></div>
  <div class="erd-slice"><img src="./erd-full-system.svg" style="top:-1680mm" /></div>
</div>

---

## 0) Master Relationship Map

![Master Relationship Map](./erd-0-master.svg)

Notes:
- Some columns such as `users.role_id` are present but not always declared with an explicit FK in the dumps; they are treated as logical associations where applicable.

---

## 1) Catalog and Asset Core

![Catalog and Asset Core](./erd-1-catalog.svg)

---

## 2) Assignments and Lifecycle Forms

![Assignments and Lifecycle Forms](./erd-2-assignments.svg)

---

## 3) Requests and Gate Passes

![Requests and Gate Passes](./erd-3-requests.svg)

---

## 4) Roles and Permissions

![Roles and Permissions](./erd-4-rbac.svg)

---

## 5) Audit and Compliance

![Audit and Compliance](./erd-5-audit.svg)

---

## 6) Asset Builder and Documents

![Asset Builder and Documents](./erd-6-builder-docs.svg)

Notes:
- `asset_counters` appears with company-only PK in some dumps and company+department in others; included here with both fields to reflect repository variability.

---

### Rendering
- These diagrams are Mermaid `erDiagram` blocks and should render in supported Markdown viewers (e.g., GitHub, VS Code with Mermaid extensions).
- For very large diagrams, prefer viewing the module-focused sections instead of the master map.
