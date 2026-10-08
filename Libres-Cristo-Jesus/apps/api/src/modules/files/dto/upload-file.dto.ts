import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import type { StorageCategory } from '../../../common/storage/domain/storage-provider.port';

/**
 * Categories a client may upload into.
 *
 * Declared as a literal array rather than derived from the type so
 * `class-validator` has real runtime values to check against — a
 * TypeScript union does not survive compilation, and an unvalidated
 * category would let a caller invent one, bypassing the per-category size
 * and MIME limits `StorageService` applies.
 */
export const UPLOADABLE_CATEGORIES = [
  'church-logo',
  'leadership-photo',
  'meeting-photo',
  'document',
  'kids-child-photo',
] as const satisfies readonly StorageCategory[];

export class UploadFileDto {
  @ApiProperty({
    enum: UPLOADABLE_CATEGORIES,
    description: 'Determines the allowed MIME types and the maximum size.',
  })
  @IsIn(UPLOADABLE_CATEGORIES)
  category!: StorageCategory;
}

/** What a successful upload returns — the path is what callers persist. */
export class UploadedFileResponseDto {
  @ApiProperty({
    example: 'leadership-photo/2026/9f1c....jpg',
    description: 'Provider-independent path. Store THIS on the entity, never a full URL.',
  })
  path!: string;

  @ApiProperty({ example: 245_318 }) size!: number;

  @ApiProperty({ example: 'image/jpeg' }) mimeType!: string;
}
