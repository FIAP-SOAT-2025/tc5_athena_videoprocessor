import { Video, VideoStatus } from './video.entity';

describe('Video Entity', () => {
  it('should create a video instance', () => {
    const video = new Video();
    video.id = 'video-123';
    video.userId = 'user-456';
    video.file_name = 'test.mp4';
    video.extension = 'mp4';
    video.size = 1024;
    video.status = VideoStatus.PENDING;
    video.createdAt = new Date();
    video.updatedAt = new Date();

    expect(video.id).toBe('video-123');
    expect(video.userId).toBe('user-456');
    expect(video.file_name).toBe('test.mp4');
    expect(video.extension).toBe('mp4');
    expect(video.size).toBe(1024);
    expect(video.status).toBe(VideoStatus.PENDING);
  });

  it('should have all VideoStatus enum values', () => {
    expect(VideoStatus.PENDING).toBe('PENDING');
    expect(VideoStatus.PROCESSING).toBe('PROCESSING');
    expect(VideoStatus.COMPLETED).toBe('COMPLETED');
    expect(VideoStatus.ERROR).toBe('ERROR');
  });
});
