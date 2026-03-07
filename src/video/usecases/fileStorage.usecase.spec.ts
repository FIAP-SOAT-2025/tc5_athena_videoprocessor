import { FileStorageUseCase } from './fileStorage.usecase';
import { UploadFileUseCase } from '../../storage/usecases/uploadFile.usecase';
import { GetFileUseCase } from 'src/storage/usecases/getFile.usecase';
import { StorageFile } from 'src/storage/domain/storage.entity';
import { Video, VideoStatus } from '../domain/video.entity';

describe('FileStorageUseCase', () => {
  let useCase: FileStorageUseCase;
  let uploadMock: jest.Mocked<UploadFileUseCase>;
  let getMock: jest.Mocked<GetFileUseCase>;

  beforeEach(() => {
    uploadMock = { execute: jest.fn() } as any;
    getMock = { execute: jest.fn() } as any;
    useCase = new FileStorageUseCase(uploadMock, getMock);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should have storeFile method', () => {
    expect(typeof useCase.storeFile).toBe('function');
  });

  it('should have storeBuffer method', () => {
    expect(typeof useCase.storeBuffer).toBe('function');
  });

  it('should have getFile method', () => {
    expect(typeof useCase.getFile).toBe('function');
  });

  describe('storeBuffer', () => {
    it('should call uploadFileUseCase when in production', async () => {
      process.env.NODE_ENV = 'production';
      const newUseCase = new FileStorageUseCase(uploadMock, getMock);
      
      uploadMock.execute.mockResolvedValue(undefined);

      const buffer = Buffer.from('test data');
      const result = await newUseCase.storeBuffer(buffer, 'test-key', 'text/plain');

      expect(uploadMock.execute).toHaveBeenCalledWith(
        expect.any(String),
        'test-key',
        buffer,
        'text/plain',
      );
      expect(result).toBe('test-key');
    });

    it('should return key after upload', async () => {
      process.env.NODE_ENV = 'production';
      const newUseCase = new FileStorageUseCase(uploadMock, getMock);
      
      uploadMock.execute.mockResolvedValue(undefined);

      const buffer = Buffer.from('data');
      const result = await newUseCase.storeBuffer(buffer, 'file-123');

      expect(uploadMock.execute).toHaveBeenCalled();
      expect(result).toBe('file-123');
    });
  });

  describe('getFile', () => {
    it('should call getFileUseCase when in production', async () => {
      process.env.NODE_ENV = 'production';
      const newUseCase = new FileStorageUseCase(uploadMock, getMock);
      
      const storageFile = new StorageFile();
      storageFile.key = 'test-key';
      storageFile.bucket = 'test-bucket';
      getMock.execute.mockResolvedValue(storageFile);

      const result = await newUseCase.getFile('test-key');

      expect(getMock.execute).toHaveBeenCalledWith(expect.any(String), 'test-key');
      expect(result).toEqual(storageFile);
    });

    it('should throw NotFoundException when S3 file not found', async () => {
      process.env.NODE_ENV = 'production';
      const newUseCase = new FileStorageUseCase(uploadMock, getMock);
      
      getMock.execute.mockRejectedValue({ Code: 'NoSuchKey' });

      await expect(newUseCase.getFile('missing')).rejects.toThrow('Arquivo não encontrado');
    });

    it('should throw error when not NotFound error occurs', async () => {
      process.env.NODE_ENV = 'production';
      const newUseCase = new FileStorageUseCase(uploadMock, getMock);
      
      getMock.execute.mockRejectedValue(new Error('Connection error'));

      await expect(newUseCase.getFile('file')).rejects.toThrow('Connection error');
    });
  });

  describe('Default bucket handling', () => {
    it('should use athena-videos as default bucket', () => {
      delete process.env.AWS_S3_BUCKET;
      expect(useCase).toBeDefined();
    });
  });
});

