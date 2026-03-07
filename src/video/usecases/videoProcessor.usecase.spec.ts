import { VideoProcessorUseCase } from './videoProcessor.usecase';
import { Video, VideoStatus } from '../domain/video.entity';

describe('VideoProcessorUseCase', () => {
  let useCase: VideoProcessorUseCase;
  let queueMock: any;
  let repositoryMock: any;

  beforeEach(() => {
    queueMock = { add: jest.fn() };
    repositoryMock = { create: jest.fn() };
    useCase = new VideoProcessorUseCase(queueMock, repositoryMock);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should process video and return job info', async () => {
    const video = new Video();
    video.id = 'video-123';
    video.userId = 'user-456';
    video.file_name = 'test.mp4';
    video.status = VideoStatus.PENDING;

    queueMock.add.mockResolvedValue({ id: 'job-789' });
    repositoryMock.create.mockResolvedValue(undefined);

    const result = await useCase.process(video);

    expect(repositoryMock.create).toHaveBeenCalledWith(video);
    expect(queueMock.add).toHaveBeenCalledWith(
      'extract-frames',
      expect.objectContaining({
        videoId: 'video-123',
        userId: 'user-456',
        originalName: 'test.mp4',
      }),
      expect.objectContaining({
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      }),
    );

    expect(result).toEqual({
      jobId: 'job-789',
      status: 'Processing',
      videoId: 'video-123',
    });
  });
});
