import { INestApplication } from '@nestjs/common';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AsistenciasDominicalesController } from '../src/modules/asistencias-dominicales/asistencias-dominicales.controller';
import { AsistenciasDominicalesService } from '../src/modules/asistencias-dominicales/asistencias-dominicales.service';

describe('AsistenciasDominicalesController (e2e)', () => {
  let app: INestApplication<App>;

  const asistenciasDominicalesService = {
    registrarPublico: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AsistenciasDominicalesController],
      providers: [
        {
          provide: AsistenciasDominicalesService,
          useValue: asistenciasDominicalesService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('POST /asistencias-dominicales/public/:token/registrar returns the expected result shape', async () => {
    asistenciasDominicalesService.registrarPublico.mockResolvedValue({
      alreadyRegistered: false,
      esNuevo: false,
      needsProfileCompletion: true,
      profileCompletion: {
        needsRed: true,
        needsFechaNacimiento: true,
      },
      persona: {
        id: 'persona-1',
        nombres: 'Ana',
        apellidos: 'Pérez',
        documento: '1010',
        celular: null,
        departamento: null,
        ciudad: null,
        fechaNacimiento: null,
        red: null,
      },
      registroId: 'registro-1',
      fechaRegistro: '2026-06-13',
      missingFields: [
        'idRed',
        'fechaNacimiento',
        'celular',
        'departamento',
        'ciudad',
      ],
    });

    const response = await request(app.getHttpServer())
      .post('/asistencias-dominicales/public/token-demo/registrar')
      .send({ documento: '1010' })
      .expect(201);

    expect(asistenciasDominicalesService.registrarPublico).toHaveBeenCalledWith(
      'token-demo',
      { documento: '1010' },
    );
    expect(response.body).toEqual({
      alreadyRegistered: false,
      esNuevo: false,
      needsProfileCompletion: true,
      profileCompletion: {
        needsRed: true,
        needsFechaNacimiento: true,
      },
      persona: {
        id: 'persona-1',
        nombres: 'Ana',
        apellidos: 'Pérez',
        documento: '1010',
        celular: null,
        departamento: null,
        ciudad: null,
        fechaNacimiento: null,
        red: null,
      },
      registroId: 'registro-1',
      fechaRegistro: '2026-06-13',
      missingFields: [
        'idRed',
        'fechaNacimiento',
        'celular',
        'departamento',
        'ciudad',
      ],
    });
  });

  it('POST /asistencias-dominicales/public/:token/registrar returns 404 for unknown documents without person payload', async () => {
    asistenciasDominicalesService.registrarPublico.mockRejectedValue(
      new NotFoundException(
        'Persona no encontrada. Completa el formulario para continuar.',
      ),
    );

    await request(app.getHttpServer())
      .post('/asistencias-dominicales/public/token-demo/registrar')
      .send({ documento: '9999' })
      .expect(404);
  });
});
