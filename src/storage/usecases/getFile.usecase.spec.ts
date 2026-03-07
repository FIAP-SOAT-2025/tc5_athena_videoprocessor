import { GetFileUseCase } from './getFile.usecase';

describe('GetFileUseCase', () => {
  let useCase: GetFileUseCase;
  let storageRepository: any;

  beforeEach(() => {
    storageRepository = {
      getFile: jest.fn(),
    };
    useCase = new GetFileUseCase(storageRepository);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should call storageRepository.getFile with correct params', async () => {
    const bucket = 'bucket';
    const key = 'key';
    const result = { key, bucket };
    storageRepository.getFile.mockResolvedValue(result);

    const response = await useCase.execute(bucket, key);
    expect(storageRepository.getFile).toHaveBeenCalledWith(bucket, key);
    expect(response).toBe(result);
  });
});
