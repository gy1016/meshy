---
name: meshy-react-ddd-oxc
description: Enforce React + TypeScript + frontend DDD layering + Oxc conventions for the Meshy tldraw and R3F assignment. Use when creating, refactoring, reviewing, or debugging app code in this repository.
---

# Meshy React DDD Oxc

## Goal

Use this skill for all code work in this repo. Keep architecture stable, boundaries clear, and style consistent while delivering the `tldraw + R3F` assignment quickly.

## Mandatory Stack And Style

1. Use React function components and TypeScript only.
2. Disallow `any` and implicit `any`.
3. Prefer single quotes, no semicolons, max line width around 80.
4. Use Oxc tooling as the formatting and linting source of truth.
5. Use absolute alias imports only for in-repo code:
   - use `@/` for modules under `src`
   - disallow `./` and `../` imports in `src` files
6. Keep naming consistent:
   - folders: `kebab-case`
   - components: `PascalCase`
   - variables/functions: `camelCase`
   - types: `*.type.ts` or `*.dto.ts`

## DDD Layering (Frontend)

Use this fixed top-level structure under `src`:

```text
src/
  domains/
  application/
  infrastructure/
  shared/
  main.tsx
```

### Layer Responsibilities

- `domains/`: core business rules, entities, domain services, domain hooks, domain-only components.
- `application/`: page composition, route orchestration, app-level state, feature wiring.
- `infrastructure/`: network/storage/config/adapters, no domain business decisions.
- `shared/`: reusable UI/hooks/utils/types/constants with no domain coupling.

### Dependency Direction (Strict)

Allowed import direction:

1. `application` -> `domains`, `shared`, `infrastructure`
2. `domains` -> `shared` only
3. `infrastructure` -> `shared` only
4. `shared` -> no business-layer imports

Forbidden:

- Cross-domain deep imports (for example, importing `domains/a/components/*` from `domains/b`).
- Importing another domain internals directly. Only consume domain public API from its `index.ts`.

## Domain Organization Standard

Each domain should use:

```text
domains/<domain-name>/
  entities/
  repositories/
  services/
  hooks/
  components/
  types/
  index.ts
```

Rules:

- `entities/`: central business models and invariants.
- `repositories/`: domain data abstraction interfaces (not transport details).
- `services/`: pure domain logic and rules.
- `components/`: domain-private business components.
- Export only stable APIs via `index.ts`.

## Component Rules

1. Keep page containers in `application/pages`, focused on orchestration.
2. Put reusable base UI in `shared/ui`.
3. If a component exceeds one of these, split it:
   - over 50 lines of JSX
   - over 6 props
   - mixed rendering plus heavy business logic
4. Move business rules to `domains/*/services`, keep view components thin.

## Assignment-Specific Architecture Constraints

For this repository (Meshy assignment), treat features as domains:

- `domains/canvas-editor`: tldraw editor interactions and shape commands.
- `domains/model-conversion`: image-to-3d conversion state and workflow.
- `domains/model-rendering`: model entity, `yRotation`, rendering inputs.

Suggested mapping:

- tldraw shape definitions and shape props contracts -> `domains/*/entities` and `domains/*/types`
- conversion orchestration and async consistency logic -> `domains/model-conversion/services`
- Meshy API transport/polling/http -> `infrastructure/request` and `infrastructure/adapter`
- page-level wiring and toolbar composition -> `application/pages`

## State And Undo Redo Rule

For user-visible editor operations, update canonical state through tldraw store oriented actions (shape create/update/delete flow) instead of hidden local-only mutations. Keep conversion async logic id-safe and race-safe before applying completion updates.

## Constants And Events

1. No magic numbers or hard-coded user-facing strings in feature code.
2. Extract constants to `shared/constants` or domain constants.
3. Event names use `handleXxx` and callback props use `onXxx`.

## Styling And Performance

1. Prefer CSS Modules or Tailwind; avoid large inline style blocks.
2. Isolate domain styles to avoid global leakage.
3. Use `useMemo` and `useCallback` only when they reduce real rerender cost.
4. For multiple 3D shapes, document the scalability approach in README if not fully implemented.

## Oxc Execution Checklist

Before finalizing significant code changes:

1. Run formatter (`oxfmt`) on touched files or project.
2. Run linter (`oxlint`) and fix issues.
3. Ensure imports respect layer boundaries.
4. Confirm no new `any` or implicit typing escapes.

If Oxc is not yet installed in this repo, first add and wire it, then follow it as default formatter/linter.

## Output Behavior For Agents

When producing code in this repository:

1. Prefer DDD-compliant placement over convenience placement.
2. Explain any temporary boundary violation and add a TODO with migration path.
3. Do not introduce new framework or state library unless explicitly requested.
4. Keep changes incremental and assignment-focused.
