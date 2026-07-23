import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  const authService = {
    loginAdmin: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('passes identifier to auth service', async () => {
    authService.loginAdmin.mockResolvedValue({ success: true });

    await controller.loginAdmin({
      identifier: '3001234567',
      password: 'secret',
    });

    expect(authService.loginAdmin).toHaveBeenCalledWith('3001234567', 'secret');
  });
});
