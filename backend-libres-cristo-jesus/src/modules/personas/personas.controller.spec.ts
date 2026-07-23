import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ADMIN_WRITE_ROLES } from '../../common/enums/rol.enum';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ROLES_KEY } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PersonasController } from './personas.controller';
import { PersonasService } from './personas.service';

describe('PersonasController', () => {
  const findAll = jest.fn();
  const findOneForRead = jest.fn();
  const findByCelularForRead = jest.fn();
  const findExportRows = jest.fn();
  const findByCelular = jest.fn();
  const findOne = jest.fn();
  const personasService = {
    findAll,
    findOneForRead,
    findByCelularForRead,
    findExportRows,
    findByCelular,
    findOne,
    create: jest.fn(),
    createUser: jest.fn(),
    promoteToPersonalAdministrativo: jest.fn(),
    assignCasaDePazLeader: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  } as unknown as PersonasService;

  const controller = new PersonasController(personasService);

  it('protects list access with admin read guards', () => {
    expect(Reflect.getMetadata(ROLES_KEY, controller.findAll)).toEqual(
      ADMIN_WRITE_ROLES,
    );
    expect(Reflect.getMetadata(GUARDS_METADATA, controller.findAll)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);
  });

  it('uses safe projections for list and ordinary read endpoints', async () => {
    const safePersona = {
      id: 'persona-1',
      nombres: 'Ana',
      apellidos: 'Pérez',
      celular: '3001234567',
      documento: '123',
      correo: 'ana@example.com',
      rol: 'ADMIN',
      roles: ['ADMIN'],
      red: { id: 'red-1', nombre: 'Red Norte' },
      invitadoPor: { id: 'persona-2', nombres: 'Luis', apellidos: 'Gómez' },
    };
    findAll.mockResolvedValue([safePersona]);
    findOneForRead.mockResolvedValue(safePersona);
    findByCelularForRead.mockResolvedValue(safePersona);

    await expect(controller.findAll()).resolves.toEqual([safePersona]);
    await expect(controller.findOne('persona-1')).resolves.toEqual(safePersona);
    await expect(controller.findByCelular('3001234567')).resolves.toEqual(
      safePersona,
    );

    expect(findAll).toHaveBeenCalledTimes(1);
    expect(findOneForRead).toHaveBeenCalledWith('persona-1');
    expect(findByCelularForRead).toHaveBeenCalledWith('3001234567');
    expect(findOne).not.toHaveBeenCalled();
    expect(findByCelular).not.toHaveBeenCalled();
  });

  it('protects single persona access with admin read guards', () => {
    expect(Reflect.getMetadata(ROLES_KEY, controller.findOne)).toEqual(
      ADMIN_WRITE_ROLES,
    );
    expect(Reflect.getMetadata(GUARDS_METADATA, controller.findOne)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);
  });

  it('protects the complete export with admin read guards and wraps rows', async () => {
    const rows = [{ id: 'persona-1' }];
    findExportRows.mockResolvedValue(rows);

    expect(Reflect.getMetadata(ROLES_KEY, controller.exportRows)).toEqual(
      ADMIN_WRITE_ROLES,
    );
    expect(Reflect.getMetadata(GUARDS_METADATA, controller.exportRows)).toEqual(
      [JwtAuthGuard, RolesGuard],
    );
    await expect(controller.exportRows()).resolves.toEqual({ rows });
  });

  it('protects celular lookup access with admin read guards', () => {
    expect(Reflect.getMetadata(ROLES_KEY, controller.findByCelular)).toEqual(
      ADMIN_WRITE_ROLES,
    );
    expect(
      Reflect.getMetadata(GUARDS_METADATA, controller.findByCelular),
    ).toEqual([JwtAuthGuard, RolesGuard]);
  });
});
