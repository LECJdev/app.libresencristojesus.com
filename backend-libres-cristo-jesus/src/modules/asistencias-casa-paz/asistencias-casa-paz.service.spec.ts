import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { DiaPredica } from '../../common/enums/dia-predica.enum';
import { EstadoAsistenciaCasaPaz } from '../../common/enums/estado-asistencia-casa-paz.enum';
import { Persona } from '../personas/persona.entity';
import { Red } from '../redes/red.entity';
import { Sede } from '../sedes/sede.entity';
import { AsistenciaCasaPazQr } from './asistencia-casa-paz-qr.entity';
import { AsistenciasCasaPazService } from './asistencias-casa-paz.service';
import { CasaPazSesion } from './casa-paz-sesion.entity';
import { RegistroAsistenciaCasaPazQr } from './registro-asistencia-casa-paz-qr.entity';

describe('AsistenciasCasaPazService', () => {
  let service: AsistenciasCasaPazService;

  const asistenciaCasaPazRepo = { findOne: jest.fn() };
  const registroCasaPazRepo = {
    findOneBy: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(),
  };
  const casaPazSesionRepo = { findOneBy: jest.fn() };
  const sedeRepo = { findOneBy: jest.fn() };
  const redRepo = { findOneBy: jest.fn() };
  const personaRepo = {
    create: jest.fn((value) => value),
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const asistencia = {
    id: 'asistencia-1',
    estado: EstadoAsistenciaCasaPaz.ACTIVO,
    diaRegistro: DiaPredica.DOMINGO,
  } as AsistenciaCasaPazQr;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AsistenciasCasaPazService,
        {
          provide: getRepositoryToken(AsistenciaCasaPazQr),
          useValue: asistenciaCasaPazRepo,
        },
        {
          provide: getRepositoryToken(RegistroAsistenciaCasaPazQr),
          useValue: registroCasaPazRepo,
        },
        {
          provide: getRepositoryToken(CasaPazSesion),
          useValue: casaPazSesionRepo,
        },
        { provide: getRepositoryToken(Sede), useValue: sedeRepo },
        { provide: getRepositoryToken(Red), useValue: redRepo },
        { provide: getRepositoryToken(Persona), useValue: personaRepo },
      ],
    }).compile();

    service = module.get<AsistenciasCasaPazService>(AsistenciasCasaPazService);
    asistenciaCasaPazRepo.findOne.mockResolvedValue(asistencia);
    jest.spyOn(service as never, 'getDiaPredicaFromDate').mockReturnValue(DiaPredica.DOMINGO);
    jest.spyOn(service as never, 'getCurrentDateString').mockReturnValue('2026-06-23');
  });

  it('throws NotFoundException when the document is unknown and no person payload is provided', async () => {
    personaRepo.findOne.mockResolvedValue(null);

    await expect(
      service.registrarPublico('valid-token', {
        documento: '9999',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates a new person from simplified Casa de Paz payload and preserves encuentro', async () => {
    const personaCreada = {
      id: 'persona-3',
      documento: '3030',
      nombres: 'Sara',
      apellidos: null,
      celular: '3001234567',
      fechaNacimiento: null,
      encuentro: true,
      idRed: null,
      red: null,
    } as unknown as Persona;

    personaRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(personaCreada);
    personaRepo.save.mockResolvedValue({ id: 'persona-3' });
    registroCasaPazRepo.findOneBy.mockResolvedValue(null);
    registroCasaPazRepo.save.mockResolvedValue({ id: 'registro-3' });

    const result = await service.registrarPublico('valid-token', {
      documento: '3030',
      persona: {
        nombreCompleto: 'Sara',
        celular: '3001234567',
        encuentro: true,
      },
    });

    expect(personaRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        nombres: 'Sara',
        apellidos: null,
        celular: '3001234567',
        encuentro: true,
      }),
    );
    expect(result).toMatchObject({
      alreadyRegistered: false,
      esNuevo: true,
      registroId: 'registro-3',
      needsProfileCompletion: false,
    });
  });
});
