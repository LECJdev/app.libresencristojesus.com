import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', async () => {
    // `ResponseWrapperInterceptor` (global, `CommonModule`) wraps every
    // response in `{ success, message, data }` — asserting the raw string
    // here would miss that envelope entirely.
    const response = await request(app.getHttpServer()).get('/').expect(200);
    expect(response.body).toMatchObject({ success: true, data: 'Hello World!' });
  });

  afterEach(async () => {
    await app.close();
  });
});
