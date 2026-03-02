import { Inject, Injectable } from '@nestjs/common';
import type { StorageRepositoryInterface } from '../gateways/storage.repository.interface';
import { StorageFile } from '../domain/storage.entity';

@Injectable()
export class UploadFileUseCase {
  constructor(
    @Inject('StorageRepositoryInterface')
    private readonly storageRepository: StorageRepositoryInterface,
  ) {}

  async execute(
    bucket: string,
    key: string,
    body: Buffer,
    contentType?: string,
  ): Promise<StorageFile> {
    return this.storageRepository.uploadFile(bucket, key, body, contentType);
  }
}
