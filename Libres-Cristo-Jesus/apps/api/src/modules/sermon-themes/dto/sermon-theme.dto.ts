import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { RecordStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

/** `POST /sermon-themes` */
export class CreateSermonThemeDto {
  @ApiProperty({ description: 'Título del tema. Único en el catálogo.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ description: 'Descripción o pasaje base.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ description: 'Serie a la que pertenece ("Fundamentos").' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  series?: string;
}

/**
 * `PATCH /sermon-themes/:id`
 *
 * `version` is required, not optional: a theme is shared by every Casa de
 * Paz that used it, so two people editing the same title from two screens
 * is a realistic accident, not a hypothetical one.
 */
export class UpdateSermonThemeDto extends PartialType(CreateSermonThemeDto) {
  @ApiPropertyOptional({ enum: RecordStatus })
  @IsOptional()
  @IsEnum(RecordStatus)
  status?: RecordStatus;

  @ApiProperty({ description: 'Versión leída, para el bloqueo optimista.' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version!: number;
}

/** `GET /sermon-themes` */
export class ListSermonThemesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Temas de esta serie.' })
  @IsOptional()
  @IsString()
  series?: string;

  @ApiPropertyOptional({ enum: RecordStatus })
  @IsOptional()
  @IsEnum(RecordStatus)
  status?: RecordStatus;
}

export class SermonThemeResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ nullable: true, type: String }) description!: string | null;
  @ApiProperty({ nullable: true, type: String }) series!: string | null;
  @ApiProperty({ enum: RecordStatus }) status!: RecordStatus;
  @ApiProperty() version!: number;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}
