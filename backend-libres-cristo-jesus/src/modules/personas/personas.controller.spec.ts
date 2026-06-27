import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ADMIN_WRITE_ROLES } from '../../common/enums/rol.enum';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ROLES_KEY } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PersonasController } from './personas.controller';
import { PersonasService } from './personas.service';

describe('PersonasController', () => {
  const personasService = {
    findAll: jest.fn(),
    findByCelular: jest.fn(),
    findOne: jest.fn(),
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

  it('protects single persona access with admin read guards', () => {
    expect(Reflect.getMetadata(ROLES_KEY, controller.findOne)).toEqual(
      ADMIN_WRITE_ROLES,
    );
    expect(Reflect.getMetadata(GUARDS_METADATA, controller.findOne)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);
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
