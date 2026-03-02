import { Inject, Injectable } from '@nestjs/common';
import type { StorageRepositoryInterface } from '../gateways/storage.repository.interface';

@Injectable()
export class DeleteFileUseCase {
  constructor(
    @Inject('StorageRepositoryInterface')
    private readonly storageRepository: StorageRepositoryInterface,
  ) {}

  async execute(bucket: string, key: string): Promise<void> {
    return this.storageRepository.deleteFile(bucket, key);
  }
}
