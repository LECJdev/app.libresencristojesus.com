import { ApiProperty } from '@nestjs/swagger';
import { KidsGuardianResponseDto } from './kids-guardian-response.dto';

/** El vínculo niño↔acudiente (`KidsChildGuardian`) + los datos del acudiente, para `POST .../guardians` y el perfil del niño. */
export class KidsChildGuardianResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() kidsChildId!: string;
  @ApiProperty() isPrimary!: boolean;
  @ApiProperty({ type: KidsGuardianResponseDto }) guardian!: KidsGuardianResponseDto;
}
