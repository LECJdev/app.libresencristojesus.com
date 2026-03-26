import { nanoid } from 'nanoid';

export function generateCustomId(prefix: string): string {
  return `${prefix}${nanoid(12)}`;
}
