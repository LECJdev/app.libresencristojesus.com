# @lcj/ui

Shared Design System for the LCJ Connect monorepo (`Documentos/18 – Especificación de Componentes del Design System.md`). One component library, consumed by every app in the workspace, so the product looks and behaves the same everywhere.

## Install / import

The package is a workspace dependency (`workspace:*`). No build step is required — it is exported as TypeScript source and transpiled by the consuming app (see `transpilePackages` in `apps/web/next.config.ts`).

```ts
// Components — always from the package root, never from a deep path.
import { Button, Card, Input } from '@lcj/ui';
```

```css
/* Design tokens — imported once, in the app's global stylesheet. */
@import 'tailwindcss';
@import '@lcj/ui/styles/tokens.css';
```

## Components

### Primitives

`Button`, `IconButton`, `Card` (+ `CardHeader`/`CardTitle`/`CardDescription`/`CardContent`/`CardFooter`), `Badge`, `Avatar`

### Forms

`Input`, `PasswordInput`, `Textarea`, `Select`, `Checkbox`, `RadioGroup` (+ `RadioGroupItem`), `Switch`

### Feedback

`Toast` (+ `ToastProvider`, `useToast`), `Loading`, `Skeleton` (+ `SkeletonText`/`SkeletonCard`/`SkeletonTable`), `EmptyState`

### Navigation

`Modal`, `Drawer`, `Sidebar`, `BottomNavigation`, `Header`, `PageHeader`, `Breadcrumb`, `Pagination`

### Data Display

`DataTable`, `ChartCard`, `KPICard`, `KPIGrid`

### Domain Cards

`OrganizationCard`, `MeetingCard`, `PersonCard`, `PeaceHouseCard`, plus the shared building blocks `DomainCard`/`DomainCardMeta`/`DomainCardMetrics`, `LeadersRow` and the status badges `EntityStatusBadge`/`MeetingStatusBadge`.

### Layout

`Container`, `Grid` (+ `GridItem`)

A live catalogue of every component above renders at `apps/web/app/(internal)/design-system`.

## Design rules this package enforces

- **Tokens, never hardcoded values** (doc18 §28) — colours, spacing, radius, shadows, durations and icon sizes all come from `styles/tokens.css`. Components compose Tailwind utilities backed by those tokens; raw hex codes or arbitrary pixel values inside a component are a bug.
- **`tablet` (768px) / `desktop` (1280px) breakpoints only** (doc18 §6) — the responsive grid is 4 columns on mobile, 8 on tablet, 12 on desktop. Use the `tablet:`/`desktop:` Tailwind variants defined in the theme; do not introduce ad-hoc breakpoints.
- **Light theme only in v1.0** (doc18 §34) — every semantic colour is indirected through a CSS variable so a future dark theme is a token swap, but dark mode is deliberately not wired yet. Do not add `prefers-color-scheme` handling in a consuming app.
