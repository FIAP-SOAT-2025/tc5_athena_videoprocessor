import { S3Repository } from './s3.repository';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

describe('S3Repository', () => {
  let repo: S3Repository;
  let s3Mock: jest.Mocked<S3Client>;

  beforeEach(() => {
    s3Mock = {
      send: jest.fn(),
    } as unknown as jest.Mocked<S3Client>;
    repo = new S3Repository();
    // @ts-ignore
    repo.s3 = s3Mock;
  });

  it('should upload file', async () => {
    s3Mock.send.mockResolvedValue({});
    const result = await repo.uploadFile('bucket', 'key', Buffer.from('data'), 'type');
    expect(s3Mock.send).toHaveBeenCalledWith(expect.any(PutObjectCommand));
    expect(result.bucket).toBe('bucket');
    expect(result.key).toBe('key');
    expect(result.contentType).toBe('type');
    expect(result.size).toBe(Buffer.from('data').length);
  });

  it('should delete file', async () => {
    s3Mock.send.mockResolvedValue({});
    await repo.deleteFile('bucket', 'key');
    expect(s3Mock.send).toHaveBeenCalledWith(expect.any(DeleteObjectCommand));
  });

  it('should get file', async () => {
    const mockBody = { transformToByteArray: jest.fn().mockResolvedValue([1,2,3]) };
    s3Mock.send.mockResolvedValue({
      Body: mockBody,
      ContentType: 'type',
      ContentLength: 3,
    });
    const result = await repo.getFile('bucket', 'key');
    expect(s3Mock.send).toHaveBeenCalledWith(expect.any(GetObjectCommand));
    expect(result.bucket).toBe('bucket');
    expect(result.key).toBe('key');
    expect(result.contentType).toBe('type');
    expect(result.size).toBe(3);
    expect(result.body).toEqual(Buffer.from([1,2,3]));
  });
});
