import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import type { VideoConsumerInterface } from '../video.consumer.interface';
import type { VideoProcessorInterface } from '../videoProcessor';
import { Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VideoStatus } from '../../domain/video.entity';
import { PrismaVideoRepository } from '../repository/video.repository';
import { FileStorageUseCase } from 'src/video/usecases/fileStorage.usecase';
import { NotificationService } from '../../services/notification.service';
interface JobData {
  videoId: string;
  userId: string;
  originalName: string;
  userEmail: string;
  userName: string;
  timestamp: number;
}

@Processor('video-processing')
export class VideoConsumer
  extends WorkerHost
  implements VideoConsumerInterface {
  private readonly logger = new Logger(VideoConsumer.name);
  private readonly outputFileName: string;

  constructor(
    @Inject('VideoProcessorInterface')
    private readonly videoProcessor: VideoProcessorInterface,
    private readonly videoRepository: PrismaVideoRepository,
    private readonly fileStorageUseCase: FileStorageUseCase,
    private readonly configService: ConfigService,
    private readonly notificationService: NotificationService,
  ) {
    super();
    this.outputFileName = this.configService.get<string>(
      'OUTPUT_FILE_NAME',
      'output.zip',
    );
  }

  async process(
    job: Job<JobData>,
  ): Promise<{ fileName: string; path: string }> {
    const { videoId, userId, originalName, userEmail, userName } = job.data;

    const baseKey = `${userId}/${videoId}`;
    const zipKey = `${baseKey}/${this.outputFileName}`;
    const videoPath = `${baseKey}/${originalName}`;

    this.logger.log(`Processing job ${job.id} for video ${videoId}`);
    try {
      const file = await this.fileStorageUseCase.getFile(videoPath);
      if (!file.body) {
        throw new Error('Arquivo de vídeo não encontrado ou vazio');
      }
      await this.videoRepository.updateStatus(videoId, VideoStatus.PROCESSING);

      await job.updateProgress(10);
      this.logger.log(`Extracting frames for video ${videoId}`);
      const frames = await this.videoProcessor.extractFrames(file.body);

      await job.updateProgress(60);
      this.logger.log(`Compressing frames for video ${videoId}`);
      const zipBuffer = await this.videoProcessor.compressFrames(frames);

      await job.updateProgress(80);
      const storedPath = await this.fileStorageUseCase.storeBuffer(
        zipBuffer,
        zipKey,
        'application/zip',
      );
      await job.updateProgress(100);
      await this.videoRepository.updateStatus(videoId, VideoStatus.COMPLETED);

       await this.notificationService.sendSuccessNotification(
          userId,
          originalName,
          userEmail,
          userName,
        );

      this.logger.log(`Video ${videoId} processed successfully`);
      return { fileName: this.outputFileName, path: storedPath };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process video ${videoId}: ${message}`);
      await this.videoRepository.updateStatus(videoId, VideoStatus.ERROR);

      try {
        await this.notificationService.sendErrorNotification(
          userId,
          originalName,
          message,
          userEmail,
          userName,
        );
        this.logger.log(`✅ Error notification sent for video ${videoId}`);
      } catch (notificationError) {
        this.logger.warn(
          `⚠️ Failed to send error notification: ${notificationError}`,
        );
      }

      throw new Error(`Erro no processamento do vídeo: ${message}`);
    }
  }
}
