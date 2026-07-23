import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ADMIN_WRITE_ROLES } from '../../common/enums/rol.enum';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ROLES_KEY } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AsistenciasDominicalesController } from './asistencias-dominicales.controller';
import { AsistenciasDominicalesService } from './asistencias-dominicales.service';

describe('AsistenciasDominicalesController', () => {
  const service = {
    exportRegistros: jest.fn(),
    findResumenPorMesByAsistencia: jest.fn(),
  } as unknown as jest.Mocked<AsistenciasDominicalesService>;
  const controller = new AsistenciasDominicalesController(service);

  it('protects the export route with admin read guards', () => {
    /* eslint-disable @typescript-eslint/unbound-method */
    expect(
      Reflect.getMetadata(
        ROLES_KEY,
        AsistenciasDominicalesController.prototype.exportRegistros,
      ),
    ).toEqual(ADMIN_WRITE_ROLES);

    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        AsistenciasDominicalesController.prototype.exportRegistros,
      ),
    ).toEqual([JwtAuthGuard, RolesGuard]);
    /* eslint-enable @typescript-eslint/unbound-method */
  });

  it('delegates the export request to the service with a supplied fecha', async () => {
    const expected = { rows: [] };
    service.exportRegistros.mockResolvedValue(expected);

    const result = await controller.exportRegistros(
      'asistencia-1',
      '2026-06-13',
    );

    /* eslint-disable @typescript-eslint/unbound-method */
    expect(service.exportRegistros).toHaveBeenCalledWith(
      'asistencia-1',
      '2026-06-13',
    );
    /* eslint-enable @typescript-eslint/unbound-method */
    expect(result).toEqual(expected);
  });

  it('delegates the historical export request to the service without a fecha', async () => {
    const expected = { rows: [] };
    service.exportRegistros.mockResolvedValue(expected);

    const result = await controller.exportRegistros('asistencia-1', undefined);

    /* eslint-disable @typescript-eslint/unbound-method */
    expect(service.exportRegistros).toHaveBeenCalledWith(
      'asistencia-1',
      undefined,
    );
    /* eslint-enable @typescript-eslint/unbound-method */
    expect(result).toEqual(expected);
  });

  it('delegates the monthly summary request to the service using only the attendance ID', async () => {
    const expected = [{ mes: '2026-01', totalAsistentes: 10, totalNuevos: 2 }];
    service.findResumenPorMesByAsistencia.mockResolvedValue(expected);

    const result =
      await controller.findResumenPorMesByAsistencia('asistencia-1');

    /* eslint-disable @typescript-eslint/unbound-method */
    expect(service.findResumenPorMesByAsistencia).toHaveBeenCalledWith(
      'asistencia-1',
    );
    /* eslint-enable @typescript-eslint/unbound-method */
    expect(result).toEqual(expected);
  });
});
