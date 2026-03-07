import { UploadFileUseCase } from './uploadFile.usecase';

describe('UploadFileUseCase', () => {
  let useCase: UploadFileUseCase;
  let storageRepository: any;

  beforeEach(() => {
    storageRepository = {
      uploadFile: jest.fn(),
    };
    useCase = new UploadFileUseCase(storageRepository);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should call storageRepository.uploadFile with correct params', async () => {
    const bucket = 'bucket';
    const key = 'key';
    const body = Buffer.from('data');
    const contentType = 'type';
    const result = { key, bucket };
    storageRepository.uploadFile.mockResolvedValue(result);

    const response = await useCase.execute(bucket, key, body, contentType);
    expect(storageRepository.uploadFile).toHaveBeenCalledWith(bucket, key, body, contentType);
    expect(response).toBe(result);
  });
});
