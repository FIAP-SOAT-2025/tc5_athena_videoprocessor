import { Injectable } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { StorageRepositoryInterface } from '../storage.repository.interface';
import { StorageFile } from '../../domain/storage.entity';

@Injectable()
export class S3Repository implements StorageRepositoryInterface {
  private readonly s3: S3Client;

  constructor() {
    this.s3 = new S3Client({
      region: process.env.AWS_REGION ?? 'us-east-1',
      ...(process.env.AWS_ENDPOINT && {
        endpoint: process.env.AWS_ENDPOINT,
        forcePathStyle: true,
      }),
    });
  }

  async uploadFile(
    bucket: string,
    key: string,
    body: Buffer,
    contentType?: string,
  ): Promise<StorageFile> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ...(contentType && { ContentType: contentType }),
      }),
    );

    return { bucket, key, contentType, size: body.length };
  }

  async deleteFile(bucket: string, key: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
  }

  async getFile(bucket: string, key: string): Promise<StorageFile> {
    const response = await this.s3.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );

    const body = Buffer.from(await response.Body!.transformToByteArray());

    return {
      bucket,
      key,
      contentType: response.ContentType,
      size: response.ContentLength,
      body,
    };
  }
}
