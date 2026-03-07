import { StorageFile } from './storage.entity';

describe('StorageFile', () => {
  it('should create an instance with properties', () => {
    const file = new StorageFile();
    file.key = 'file-key';
    file.bucket = 'bucket-name';
    file.contentType = 'image/png';
    file.size = 1234;
    file.body = Buffer.from('data');

    expect(file.key).toBe('file-key');
    expect(file.bucket).toBe('bucket-name');
    expect(file.contentType).toBe('image/png');
    expect(file.size).toBe(1234);
    expect(file.body).toEqual(Buffer.from('data'));
  });

  it('should allow optional properties to be undefined', () => {
    const file = new StorageFile();
    file.key = 'file-key';
    file.bucket = 'bucket-name';
    expect(file.contentType).toBeUndefined();
    expect(file.size).toBeUndefined();
    expect(file.body).toBeUndefined();
  });
});
