import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Rol } from '../../common/enums/rol.enum';
import { CasaDePaz } from './casa-de-paz.entity';
import { CasasDePazService } from './casas-de-paz.service';

describe('CasasDePazService', () => {
  let service: CasasDePazService;

  const leaderUser = {
    id: 'persona-leader',
    rol: Rol.LIDER_CASA_DE_PAZ,
    roles: [Rol.LIDER_CASA_DE_PAZ],
  };

  const casaRepo = {
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CasasDePazService,
        {
          provide: getRepositoryToken(CasaDePaz),
          useValue: casaRepo,
        },
      ],
    }).compile();

    service = module.get<CasasDePazService>(CasasDePazService);
  });

  it('limits leader lists to houses owned by the authenticated persona', async () => {
    casaRepo.find.mockResolvedValue([]);

    await service.findAll(leaderUser);

    expect(casaRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { idPersonaACargo: leaderUser.id },
      }),
    );
  });

  it('assigns leader-owned Casa de Paz records to the authenticated leader on create', async () => {
    await service.create(
      { direccion: 'Main street', idPersonaACargo: 'persona-other' },
      leaderUser,
    );

    expect(casaRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        idPersonaACargo: leaderUser.id,
      }),
    );
  });

  it('throws when a scoped leader requests a Casa de Paz outside their ownership', async () => {
    casaRepo.findOne.mockResolvedValue(null);

    await expect(
      service.findOne('id_casa_de_paz_1', leaderUser),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
