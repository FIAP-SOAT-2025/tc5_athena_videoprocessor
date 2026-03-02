import { Module } from '@nestjs/common';
import { UploadFileUseCase } from './usecases/uploadFile.usecase';
import { DeleteFileUseCase } from './usecases/deleteFile.usecase';
import { GetFileUseCase } from './usecases/getFile.usecase';
import { S3Repository } from './gateways/repository/s3.repository';

@Module({
  providers: [
    UploadFileUseCase,
    DeleteFileUseCase,
    GetFileUseCase,
    {
      provide: 'StorageRepositoryInterface',
      useClass: S3Repository,
    },
  ],
  exports: [UploadFileUseCase, DeleteFileUseCase, GetFileUseCase],
})
export class StorageModule {}
