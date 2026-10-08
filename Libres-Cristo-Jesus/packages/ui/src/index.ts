/**
 * `@lcj/ui` — LCJ Connect Design System.
 *
 * Single entry point for every shared component, so consumers import from
 * `@lcj/ui` and never reach into deep paths (which would make internal
 * reorganisation a breaking change).
 *
 * Design tokens live in `./styles/tokens.css` and are imported once by the
 * consuming app, not per component.
 */

/* Utilities */
export { cn } from './lib/cn';
export { Icon, ICON_SIZES, type IconProps, type IconSize } from './lib/icon';

/* Primitives */
export * from './components/button';
export * from './components/card';
export * from './components/badge';
export * from './components/avatar';

/* Forms */
export * from './components/input';
export * from './components/textarea';
export * from './components/select';
export * from './components/checkbox';
export * from './components/radio';
export * from './components/switch';

/* Feedback */
export * from './components/toast';
export * from './components/loading';
export * from './components/skeleton';
export * from './components/empty-state';

/* Navigation */
export * from './components/modal';
export * from './components/drawer';
export * from './components/popover';
export * from './components/sidebar';
export * from './components/header';
export * from './components/breadcrumb';
export * from './components/pagination';

/* Data display */
export * from './components/data-table';
export * from './components/chart-card';
export * from './components/kpi-card';

/* Domain cards */
export * from './components/domain-cards';

/* Layout */
export * from './components/layout';
