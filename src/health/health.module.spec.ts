import { Test, TestingModule } from '@nestjs/testing';
import { HealthModule } from './health.module';

describe('HealthModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [HealthModule],
    }).compile();
  });

  it('should be defined', () => {
    const healthModule = module.get<HealthModule>(HealthModule);
    expect(healthModule).toBeDefined();
  });
});
