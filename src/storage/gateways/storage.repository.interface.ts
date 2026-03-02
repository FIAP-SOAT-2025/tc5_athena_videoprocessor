import { StorageFile } from '../domain/storage.entity';

export interface StorageRepositoryInterface {
  uploadFile(
    bucket: string,
    key: string,
    body: Buffer,
    contentType?: string,
  ): Promise<StorageFile>;

  deleteFile(bucket: string, key: string): Promise<void>;

  getFile(bucket: string, key: string): Promise<StorageFile>;
}
