import { DeleteFileUseCase } from './deleteFile.usecase';
import type { StorageRepositoryInterface } from '../gateways/storage.repository.interface';

describe('DeleteFileUseCase', () => {
  let useCase: DeleteFileUseCase;
  let storageRepository: jest.Mocked<StorageRepositoryInterface>;

  beforeEach(() => {
    storageRepository = {
      deleteFile: jest.fn(),
    } as unknown as jest.Mocked<StorageRepositoryInterface>;
    useCase = new DeleteFileUseCase(storageRepository);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should call storageRepository.deleteFile with correct params', async () => {
    const bucket = 'bucket';
    const key = 'key';
    storageRepository.deleteFile.mockResolvedValue(undefined);

    await useCase.execute(bucket, key);
    expect(storageRepository.deleteFile).toHaveBeenCalledWith(bucket, key);
  });
});
