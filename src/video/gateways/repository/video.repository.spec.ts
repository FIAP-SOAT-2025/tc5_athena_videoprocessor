jest.mock('../../../database/dbConection');

import { PrismaVideoRepository } from './video.repository';
import { Video, VideoStatus } from '../../domain/video.entity';

describe('PrismaVideoRepository', () => {
  let repository: PrismaVideoRepository;
  let mockORM: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockORM = {
      video: {
        create: jest.fn().mockResolvedValue({ id: 'vid-123' }),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };

    repository = new PrismaVideoRepository(mockORM);
  });

  describe('create', () => {
    it('should create a video record', async () => {
      const video = new Video({
        id: 'video-1',
        size: 1024,
        file_name: 'test.mp4',
        extension: 'mp4',
        status: VideoStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: 'user-1',
      });

      const result = await repository.create(video);

      expect(mockORM.video.create).toHaveBeenCalledWith({
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
      expect(result).toBeDefined();
    });

  });

  describe('findById', () => {
    it('should find a video by ID', async () => {
      const videoId = 'video-1';
      const mockVideo = { id: videoId, file_name: 'test.mp4' };
      mockORM.video.findUnique.mockResolvedValue(mockVideo);

      const result = await repository.findById(videoId);

      expect(mockORM.video.findUnique).toHaveBeenCalledWith({ where: { id: videoId } });
      expect(result).toEqual(mockVideo);
    });

    it('should return null when video not found', async () => {
      mockORM.video.findUnique.mockResolvedValue(null);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      mockORM.video.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(repository.findById('video-1')).rejects.toThrow('Database error');
    });
  });

  describe('findByUserId', () => {
    it('should find all videos by user ID', async () => {
      const userId = 'user-1';
      const mockVideos = [
        { id: 'vid-1', userId, file_name: 'video1.mp4' },
        { id: 'vid-2', userId, file_name: 'video2.mp4' },
      ];
      mockORM.video.findMany.mockResolvedValue(mockVideos);

      const result = await repository.findByUserId(userId);

      expect(mockORM.video.findMany).toHaveBeenCalledWith({ where: { userId } });
      expect(result).toEqual(mockVideos);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when user has no videos', async () => {
      mockORM.video.findMany.mockResolvedValue([]);

      const result = await repository.findByUserId('user-no-videos');

      expect(result).toEqual([]);
    });
  });

  describe('updateStatus', () => {
    it('should update video status', async () => {
      const videoId = 'video-1';
      const newStatus = VideoStatus.COMPLETED;
      const updatedVideo = {
        id: videoId,
        status: newStatus,
        updatedAt: new Date(),
      };
      mockORM.video.update.mockResolvedValue(updatedVideo);

      const result = await repository.updateStatus(videoId, newStatus);

      expect(mockORM.video.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: videoId },
          data: expect.objectContaining({
            status: newStatus,
          }),
        }),
      );
      expect(result.status).toBe(newStatus);
    });

    it('should update video to ERROR status', async () => {
      mockORM.video.update.mockResolvedValue({
        id: 'video-1',
        status: VideoStatus.ERROR,
      });

      await repository.updateStatus('video-1', VideoStatus.ERROR);

      expect(mockORM.video.update).toHaveBeenCalled();
    });

    it('should update updatedAt timestamp', async () => {
      mockORM.video.update.mockResolvedValue({ id: 'video-1' });
      const beforeUpdate = new Date();

      await repository.updateStatus('video-1', VideoStatus.PROCESSING);

      const callArgs = mockORM.video.update.mock.calls[0][0];
      expect(callArgs.data.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
    });
  });
});
