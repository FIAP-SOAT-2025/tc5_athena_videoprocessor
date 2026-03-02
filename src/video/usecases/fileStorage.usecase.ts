import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import { join } from 'path';
import { UploadFileUseCase } from '../../storage/usecases/uploadFile.usecase';
import { GetFileUseCase } from 'src/storage/usecases/getFile.usecase';
import { StorageFile } from 'src/storage/domain/storage.entity';
import { Video } from '../domain/video.entity';

@Injectable()
export class FileStorageUseCase {
  private readonly logger = new Logger(FileStorageUseCase.name);
  private readonly isLocal: boolean;
  private readonly bucket: string;

  constructor(
    private readonly uploadFileUseCase: UploadFileUseCase,
    private readonly getFileUseCase: GetFileUseCase,
  ) {
    this.isLocal = process.env.NODE_ENV === 'development';
    this.bucket = process.env.AWS_S3_BUCKET ?? 'athena-videos';
  }

  async storeFile(video: Video, file: Express.Multer.File): Promise<void> {
    const key = `${video.userId}/${video.id}/${file.originalname}`;
    this.logger.log(`Storing file: ${key}`);

    if (this.isLocal) {
      const filePath = join(process.cwd(), '..', 'uploads', key);
      await fs.promises.mkdir(
        filePath.substring(0, filePath.lastIndexOf('/')),
        { recursive: true },
      );
      await fs.promises.writeFile(filePath, file.buffer);
    } else {
      await this.uploadFileUseCase.execute(
        this.bucket,
        key,
        file.buffer,
        file.mimetype,
      );
    }
  }

  async storeBuffer(
    buffer: Buffer,
    key: string,
    contentType?: string,
  ): Promise<string> {
    this.logger.log(`Storing buffer: ${key}`);
    if (this.isLocal) {
      const filePath = join(process.cwd(), '..', 'uploads', key);
      await fs.promises.mkdir(
        filePath.substring(0, filePath.lastIndexOf('/')),
        { recursive: true },
      );
      await fs.promises.writeFile(filePath, buffer);
      return filePath;
    }

    await this.uploadFileUseCase.execute(
      this.bucket,
      key,
      buffer,
      contentType ?? 'application/octet-stream',
    );
    return key;
  }

  async getFile(key: string): Promise<StorageFile> {
    this.logger.log(`Retrieving file: ${key}`);
    try {
      if (this.isLocal) {
        const filePath = join(process.cwd(), '..', 'uploads', key);
        const buffer = await fs.promises.readFile(filePath);
        const file = new StorageFile();
        file.key = key;
        file.bucket = 'local';
        file.body = buffer;
        return file;
      }

      return await this.getFileUseCase.execute(this.bucket, key);
    } catch (error: unknown) {
      const isNotFound =
        (error as { Code?: string }).Code === 'NoSuchKey' ||
        (error as { code?: string }).code === 'ENOENT';
      if (isNotFound) {
        this.logger.warn(`File not found: ${key}`);
        throw new NotFoundException(`Arquivo não encontrado`);
      }
      throw error;
    }
  }
}
