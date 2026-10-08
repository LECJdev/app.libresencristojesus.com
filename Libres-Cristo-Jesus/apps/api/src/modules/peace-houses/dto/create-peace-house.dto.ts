import { ApiProperty } from '@nestjs/swagger';
import {
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';

/**
 * `POST /peace-houses` body — creates a `PeaceHouse` row (`Documentos/04-modelo-de-datos.md`
 * section 4, `Documentos/07-modulo-casas-de-paz.md` US-007). Field list matches US-007's
 * "Formulario": Nombre, Departamento, Municipio, Barrio, Dirección, Horario, Liderazgo.
 *
 * - `districtId` / `name`: `(districtId, name)` is unique at the DB level
 *   (`prisma/schema.prisma` `@@unique([districtId, name])`, US-007 "No permitir dos Casas
 *   iguales en el mismo Distrito") — `PeaceHousesService.create` re-checks this before insert
 *   to return a clean 409 instead of a raw constraint error.
 * - `leadershipUnitId` is REQUIRED (unlike `District.leadershipUnitId`, which is optional) —
 *   `prisma/schema.prisma`'s `PeaceHouse.leadershipUnitId` column itself is non-nullable
 *   ("the leader of a PeaceHouse (required there)"). `PeaceHousesService.create` validates it
 *   references a `LeadershipUnit` whose `CatRole` is exactly "Líder", and that this
 *   `LeadershipUnit` does not already lead another active Casa de Paz (RN-019 "Una Unidad de
 *   Liderazgo únicamente podrá administrar una Casa de Paz").
 * - `departmentId`/`municipalityId` are now real FKs into `CatDepartment`/`CatMunicipality`
 *   (seeded by `pnpm db:seed:geo`), no longer free text. `PeaceHousesService` validates both
 *   exist AND that the municipality actually belongs to the given department — a mismatched
 *   pair would pass the database's own constraints while placing a Casa de Paz in a
 *   municipality of another department, which is exactly the kind of silent wrong answer the
 *   national coverage view would then report as fact.
 * - `meetingDay` is free text on purpose — doc04/doc07 never enumerate a closed set of weekday
 *   values (matches the schema column's own comment).
 * - `meetingHour` is validated as `HH:mm` (24h) — doc04/doc07 never specify a precision
 *   requirement, but a basic format check avoids garbage values reaching the free-text column.
 */
export class CreatePeaceHouseDto {
  @ApiProperty({ description: 'District this Casa de Paz belongs to.' })
  @IsUUID()
  districtId!: string;

  @ApiProperty({
    description: 'LeadershipUnit acting as this Casa de Paz\'s Líder. Must have the "Líder" role.',
  })
  @IsUUID()
  leadershipUnitId!: string;

  @ApiProperty({ example: 'Casa de Paz Esperanza' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'UUID of a CatDepartment. Required when municipalityId is present.',
  })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'UUID of a CatMunicipality. Must belong to departmentId.',
  })
  @IsOptional()
  @IsUUID()
  municipalityId?: string;

  @ApiProperty({
    required: false,
    nullable: true,
    example: 'CP-09-004',
    description: 'Human-readable code. Unique across all Casas de Paz when provided.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  code?: string;

  @ApiProperty({
    required: false,
    nullable: true,
    example: 6.244203,
    description: 'Optional latitude (-90..90).',
  })
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @ApiProperty({
    required: false,
    nullable: true,
    example: -75.581215,
    description: 'Optional longitude (-180..180).',
  })
  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  neighborhood?: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({
    required: false,
    nullable: true,
    example: 'Jueves',
    description: 'Free text — no fixed weekday set.',
  })
  @IsOptional()
  @IsString()
  meetingDay?: string;

  @ApiProperty({
    required: false,
    nullable: true,
    example: '19:00',
    description: '24h HH:mm format.',
  })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'meetingHour must be in 24h HH:mm format (e.g. "19:00")',
  })
  meetingHour?: string;
}
