/**
 * Shared TypeScript types for the LCJ Connect monorepo.
 *
 * Domain types (e.g. Person, Meeting, District, PeaceHouse) will be added
 * here starting in later phases, as each business domain is implemented.
 */
export type Nullable<T> = T | null;

export * from './api-response';
export * from './auth';
export * from './base-entity';
export * from './geography';
export * from './organization';
export * from './sync';
export * from './role';
export * from './storage';
export * from './kids';
