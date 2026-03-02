import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Video } from '../domain/video.entity';
import { PrismaVideoRepository } from '../gateways/repository/video.repository';

@Injectable()
export class VideoProcessorUseCase {
  private readonly logger = new Logger(VideoProcessorUseCase.name);

  constructor(
    @InjectQueue('video-processing')
    private readonly videoQueue: Queue,
    private readonly videoRepository: PrismaVideoRepository,
  ) {}

  async process(video: Video) {
    this.logger.log(`Creating video record: ${video.id}`);
    await this.videoRepository.create(video);

    const timestamp = Date.now();
    this.logger.log(`Queuing job for video ${video.id}`);

    const job = await this.videoQueue.add(
      'extract-frames',
      {
        videoId: video.id,
        userId: video.userId,
        originalName: video.file_name,
        timestamp: timestamp,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      },
    );

    return { jobId: job.id, status: 'Processing', videoId: video.id };
  }
}
