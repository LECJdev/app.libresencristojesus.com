import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';
import { HEX_COLOR_MESSAGE, HEX_COLOR_PATTERN } from './create-organization.dto';

/**
 * `PATCH /organizations/:id` body. `version` is required (not optional), matching
 * `UpdateUserDto`'s convention (doc04 §13/§14 optimistic locking):
 * `OrganizationService` compares it against the current `Church.version` and
 * rejects with 409 on a mismatch.
 */
export class UpdateOrganizationDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  logo?: string;
  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, nullable: true, example: '#1A2B3C' })
  @IsOptional()
  @Matches(HEX_COLOR_PATTERN, { message: HEX_COLOR_MESSAGE })
  primaryColor?: string;

  @ApiProperty({ required: false, nullable: true, example: '#D4AF37' })
  @IsOptional()
  @Matches(HEX_COLOR_PATTERN, { message: HEX_COLOR_MESSAGE })
  secondaryColor?: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description: 'Optimistic locking counter — must match the current Church.version.',
  })
  @IsInt()
  @Min(1)
  version!: number;
}
