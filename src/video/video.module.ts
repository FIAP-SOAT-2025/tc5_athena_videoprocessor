import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { VideoConsumer } from './gateways/queue/video.consumer';
import { VideoProcessorService } from './gateways/processor/videoProcessor.service';
import { VideoProcessorUseCase } from './usecases/videoProcessor.usecase';
import { dbConection } from '../database/dbConection';
import { PrismaVideoRepository } from './gateways/repository/video.repository';
import { FileStorageUseCase } from './usecases/fileStorage.usecase';
import { StorageModule } from '../storage/storage.module';
import { NotificationService } from './services/notification.service';
@Module({
  imports: [
    ConfigModule.forRoot(),
    StorageModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    BullModule.registerQueue({
      name: 'video-processing',
    }),
  ],
  providers: [
    VideoProcessorUseCase,
    FileStorageUseCase,
    VideoConsumer,
    PrismaVideoRepository,
    NotificationService,
    {
      provide: 'VideoProcessorInterface',
      useClass: VideoProcessorService,
    },
    dbConection,
  ],
})
export class VideoModule {}
