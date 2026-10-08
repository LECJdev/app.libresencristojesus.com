import { ApiProperty } from '@nestjs/swagger';
import { KidsChildResponseDto } from './kids-child-response.dto';
import { KidsChildGuardianResponseDto } from './kids-child-guardian-response.dto';
import { KidsConsentResponseDto } from './kids-consent-response.dto';

/**
 * `GET /kids/children/:id` — perfil completo. La autorización se muestra
 * SIEMPRE, esté en el estado que esté (RN definitiva: la falta de
 * autorización nunca oculta ni borra al niño).
 */
export class KidsChildDetailResponseDto extends KidsChildResponseDto {
  @ApiProperty({ type: [KidsChildGuardianResponseDto] }) guardians!: KidsChildGuardianResponseDto[];
  @ApiProperty({ type: KidsConsentResponseDto }) consent!: KidsConsentResponseDto;
}
