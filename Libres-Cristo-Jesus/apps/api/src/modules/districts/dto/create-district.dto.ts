import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';

/**
 * `POST /districts` body — creates a `District` row (`Documentos/04-modelo-de-datos.md`
 * section 4, `Documentos/06-modulo-organizacion.md` section 2: `Church -> District ->
 * PeaceHouse`). `number` is unique per `churchId` at the DB level
 * (`prisma/schema.prisma` `@@unique([churchId, number])`) — `DistrictsService.create`
 * re-checks this before insert to return a clean 409 instead of a raw constraint error.
 *
 * `leadershipUnitId` is optional — doc07 US-005's flow creates the District first, then
 * separately assigns its Pastor de Distrito. When present, `DistrictsService.create`
 * validates it references a `LeadershipUnit` whose `CatRole` is exactly "Pastor
 * Distrito" (a District can never be led by a Líder or any other role).
 */
export class CreateDistrictDto {
  @ApiProperty({ description: 'Church this District belongs to.' })
  @IsUUID()
  churchId!: string;

  @ApiProperty({ example: 9, description: 'District number — unique within its Church.' })
  @IsInt()
  @Min(1)
  number!: number;

  @ApiProperty({ example: 'Distrito 09' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Free-text description of the district.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    required: false,
    nullable: true,
    description:
      'LeadershipUnit acting as this District\'s Pastor de Distrito. Must have the "Pastor Distrito" role.',
  })
  @IsOptional()
  @IsUUID()
  leadershipUnitId?: string;
}
