import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

/** `PATCH /kids/guardians/:id` body — edita los datos del acudiente (compartidos entre todos los niños vinculados). */
export class UpdateKidsGuardianDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  firstName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  lastName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  relationship?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  phone?: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  altPhone?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string | null;

  @ApiProperty({ description: 'Optimistic locking counter — must match the current KidsGuardian.version.' })
  @IsInt()
  @Min(1)
  version!: number;
}
