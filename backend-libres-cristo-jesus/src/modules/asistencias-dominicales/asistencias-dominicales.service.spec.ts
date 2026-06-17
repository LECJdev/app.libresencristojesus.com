import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { DiaPredica } from '../../common/enums/dia-predica.enum';
import { EstadoAsistenciaDominical } from '../../common/enums/estado-asistencia-dominical.enum';
import { Persona } from '../personas/persona.entity';
import { Red } from '../redes/red.entity';
import { Sede } from '../sedes/sede.entity';
import { AsistenciaDominical } from './asistencia-dominical.entity';
import { AsistenciasDominicalesService } from './asistencias-dominicales.service';
import { RegistroAsistenciaDominical } from './registro-asistencia-dominical.entity';

describe('AsistenciasDominicalesService', () => {
  let service: AsistenciasDominicalesService;

  const asistenciaDominicalRepo = { findOne: jest.fn() };
  const registroDominicalRepo = {
    findOneBy: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(),
  };
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
    estado: EstadoAsistenciaDominical.ACTIVO,
    diaRegistro: DiaPredica.DOMINGO,
  } as AsistenciaDominical;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AsistenciasDominicalesService,
        {
          provide: getRepositoryToken(AsistenciaDominical),
          useValue: asistenciaDominicalRepo,
        },
        {
          provide: getRepositoryToken(RegistroAsistenciaDominical),
          useValue: registroDominicalRepo,
        },
        { provide: getRepositoryToken(Sede), useValue: sedeRepo },
        { provide: getRepositoryToken(Red), useValue: redRepo },
        { provide: getRepositoryToken(Persona), useValue: personaRepo },
      ],
    }).compile();

    service = module.get<AsistenciasDominicalesService>(AsistenciasDominicalesService);
    jest.spyOn(service, 'getPublicByToken').mockResolvedValue(asistencia);
    jest.spyOn(service as never, 'getDiaPredicaFromDate').mockReturnValue(DiaPredica.DOMINGO);
    jest.spyOn(service as never, 'getCurrentDateString').mockReturnValue('2026-06-13');
  });

  it('registers an existing person by document and computes missing profile fields', async () => {
    const persona = {
      id: 'persona-1',
      documento: '1010',
      nombres: 'Ana',
      apellidos: 'Pérez',
      celular: null,
      departamento: null,
      ciudad: null,
      fechaNacimiento: null,
      idRed: null,
      red: null,
    } as Persona;

    personaRepo.findOne.mockResolvedValue(persona);
    registroDominicalRepo.findOneBy.mockResolvedValue(null);
    registroDominicalRepo.save.mockResolvedValue({ id: 'registro-1' });

    const result = await service.registrarPublico('valid-token', {
      documento: '1010',
    });

    expect(result).toMatchObject({
      alreadyRegistered: false,
      esNuevo: false,
      registroId: 'registro-1',
      missingFields: ['idRed', 'fechaNacimiento', 'celular', 'departamento', 'ciudad'],
    });
  });

  it('returns alreadyRegistered when the person was already registered today', async () => {
    const persona = {
      id: 'persona-2',
      documento: '2020',
      nombres: 'Luis',
      apellidos: 'Gómez',
      celular: '3001234567',
      departamento: 'Antioquia',
      ciudad: 'Medellín',
      fechaNacimiento: '1990-01-01',
      idRed: 'red-1',
      red: { id: 'red-1', nombre: 'Red 1' },
    } as unknown as Persona;

    personaRepo.findOne.mockResolvedValue(persona);
    registroDominicalRepo.findOneBy.mockResolvedValue({
      id: 'registro-existente',
      esNuevo: false,
    });

    const result = await service.registrarPublico('valid-token', {
      documento: '2020',
    });

    expect(result).toMatchObject({
      alreadyRegistered: true,
      registroId: 'registro-existente',
      missingFields: [],
    });
    expect(registroDominicalRepo.save).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the document is unknown and no person payload is provided', async () => {
    personaRepo.findOne.mockResolvedValue(null);

    await expect(
      service.registrarPublico('valid-token', {
        documento: '9999',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates a new person and links attendance when the document is unknown and person payload is provided', async () => {
    const personaCreada = {
      id: 'persona-3',
      documento: '3030',
      nombres: 'Sara',
      apellidos: 'Ruiz',
      celular: '3001234567',
      departamento: 'Antioquia',
      ciudad: 'Medellín',
      fechaNacimiento: null,
      idRed: null,
      red: null,
    } as unknown as Persona;

    personaRepo.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(personaCreada);
    personaRepo.save.mockResolvedValue({ id: 'persona-3' });
    registroDominicalRepo.findOneBy.mockResolvedValue(null);
    registroDominicalRepo.save.mockResolvedValue({ id: 'registro-3' });

    const result = await service.registrarPublico('valid-token', {
      documento: '3030',
      persona: {
        nombres: 'Sara',
        apellidos: 'Ruiz',
        celular: '3001234567',
        departamento: 'Antioquia',
        ciudad: 'Medellín',
      },
    });

    expect(personaRepo.create).toHaveBeenCalled();
    expect(result).toMatchObject({
      alreadyRegistered: false,
      esNuevo: true,
      registroId: 'registro-3',
      missingFields: ['idRed', 'fechaNacimiento'],
    });
  });
});
