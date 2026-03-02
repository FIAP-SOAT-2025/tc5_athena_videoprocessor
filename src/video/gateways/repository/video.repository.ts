import { Injectable } from '@nestjs/common';
import { dbConection } from '../../../database/dbConection';
import { videoRepositoryInterface } from '../video.repository.interface';
import { Video, VideoStatus} from '../../domain/video.entity';

@Injectable()
export class PrismaVideoRepository implements videoRepositoryInterface {
  constructor(private orm: dbConection) {}

  async create(video: Video): Promise<any> {
    

    return this.orm.video.create({
      data: {
        id: video.id,
        size: video.size,
        file_name: video.file_name,
        extension: video.extension,
        status: video.status,
        createdAt: video.createdAt,
        updatedAt: video.updatedAt,
        userId: video.userId,
      },
    });
  }

  async findById(id: string): Promise<any | null> {
    return this.orm.video.findUnique({ where: { id } });
  }

  async findByUserId(userId: string): Promise<any[]> {
    return this.orm.video.findMany({ where: { userId } });
  }

  async updateStatus(id: string, status: VideoStatus): Promise<any> {
    return this.orm.video.update({
      where: { id },
      data: { status, updatedAt: new Date() },
    });
  }
}
