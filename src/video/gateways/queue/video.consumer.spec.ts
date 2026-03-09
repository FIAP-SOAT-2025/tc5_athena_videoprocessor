jest.mock('bullmq', () => ({
  Job: jest.fn(),
  Worker: jest.fn(() => ({
    on: jest.fn(),
    close: jest.fn(),
  })),
  Queue: jest.fn(() => ({
    add: jest.fn(),
    process: jest.fn(),
  })),
}));

jest.mock('@nestjs/bullmq', () => ({
  BullModule: {
    forRoot: jest.fn(() => ({ module: {} })),
    registerQueue: jest.fn(() => ({ module: {} })),
  },
  InjectQueue: () => (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) => {},
  WorkerHost: class WorkerHostMock {
    on = jest.fn();
  },
  Processor: () => (target: any) => target,
}));

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => ({
    video: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  })),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { VideoConsumer } from './video.consumer';
import { Job } from 'bullmq';
import { VideoStatus } from '../../domain/video.entity';
import { ConfigService } from '@nestjs/config';
import { PrismaVideoRepository } from '../repository/video.repository';
import { FileStorageUseCase } from 'src/video/usecases/fileStorage.usecase';
import { NotificationService } from '../../services/notification.service';
import type { VideoProcessorInterface } from '../videoProcessor';

describe('VideoConsumer', () => {
  let consumer: VideoConsumer;
  let videoProcessorMock: VideoProcessorInterface;
  let videoRepositoryMock: PrismaVideoRepository;
  let fileStorageUseCaseMock: FileStorageUseCase;
  let configServiceMock: ConfigService;
  let notificationServiceMock: NotificationService;

  const mockVideoProcessor: VideoProcessorInterface = {
    extractFrames: jest.fn(),
    compressFrames: jest.fn(),
  };

  const mockVideoRepository = {
    updateStatus: jest.fn(),
  };

  const mockFileStorageUseCase = {
    getFile: jest.fn(),
    storeBuffer: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('output.zip'),
  };

  const mockNotificationService = {
    sendSuccessNotification: jest.fn(),
    sendErrorNotification: jest.fn(),
    healthCheck: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VideoConsumer,
        {
          provide: 'VideoProcessorInterface',
          useValue: mockVideoProcessor,
        },
        {
          provide: PrismaVideoRepository,
          useValue: mockVideoRepository,
        },
        {
          provide: FileStorageUseCase,
          useValue: mockFileStorageUseCase,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
      ],
    }).compile();

    consumer = module.get<VideoConsumer>(VideoConsumer);
    videoProcessorMock = module.get('VideoProcessorInterface');
    videoRepositoryMock = module.get<PrismaVideoRepository>(
      PrismaVideoRepository,
    );
    fileStorageUseCaseMock = module.get<FileStorageUseCase>(FileStorageUseCase);
    configServiceMock = module.get<ConfigService>(ConfigService);
    notificationServiceMock = module.get<NotificationService>(NotificationService);
  });

  it('should be defined', () => {
    expect(consumer).toBeDefined();
  });

  describe('process', () => {
    const baseJobData = {
      videoId: 'video-123',
      userId: 'user-456',
      originalName: 'video.mp4',
      timestamp: Date.now(),
    };

    it('should successfully process a video job', async () => {
      const mockJob = {
        id: 'job-1',
        data: baseJobData,
        updateProgress: jest.fn(),
      } as unknown as Job;

      const mockVideoBuffer = Buffer.from('video content');
      const mockFrames = [
        { name: 'frame-001.png', data: Buffer.from('frame1') },
        { name: 'frame-002.png', data: Buffer.from('frame2') },
      ];
      const mockZipBuffer = Buffer.from('zipped content');

      (mockFileStorageUseCase.getFile as jest.Mock).mockResolvedValue({
        body: mockVideoBuffer,
      });

      (mockVideoProcessor.extractFrames as jest.Mock).mockResolvedValue(
        mockFrames,
      );

      (mockVideoProcessor.compressFrames as jest.Mock).mockResolvedValue(
        mockZipBuffer,
      );

      (mockFileStorageUseCase.storeBuffer as jest.Mock).mockResolvedValue(
        '/stored/path/output.zip',
      );

      const result = await consumer.process(mockJob);

      expect(result.fileName).toBe('output.zip');
      expect(result.path).toBe('/stored/path/output.zip');
    });

    it('should update video status to PROCESSING', async () => {
      const mockJob = {
        id: 'job-2',
        data: baseJobData,
        updateProgress: jest.fn(),
      } as unknown as Job;

      const mockVideoBuffer = Buffer.from('video content');
      const mockFrames = [
        { name: 'frame-001.png', data: Buffer.from('frame1') },
      ];
      const mockZipBuffer = Buffer.from('zipped');

      (mockFileStorageUseCase.getFile as jest.Mock).mockResolvedValue({
        body: mockVideoBuffer,
      });

      (mockVideoProcessor.extractFrames as jest.Mock).mockResolvedValue(
        mockFrames,
      );

      (mockVideoProcessor.compressFrames as jest.Mock).mockResolvedValue(
        mockZipBuffer,
      );

      (mockFileStorageUseCase.storeBuffer as jest.Mock).mockResolvedValue(
        '/path',
      );

      await consumer.process(mockJob);

      expect(mockVideoRepository.updateStatus).toHaveBeenCalledWith(
        'video-123',
        VideoStatus.PROCESSING,
      );
    });

    it('should update video status to COMPLETED on success', async () => {
      const mockJob = {
        id: 'job-3',
        data: baseJobData,
        updateProgress: jest.fn(),
      } as unknown as Job;

      const mockVideoBuffer = Buffer.from('video');
      const mockFrames = [{ name: 'frame.png', data: Buffer.from('f') }];
      const mockZipBuffer = Buffer.from('zip');

      (mockFileStorageUseCase.getFile as jest.Mock).mockResolvedValue({
        body: mockVideoBuffer,
      });

      (mockVideoProcessor.extractFrames as jest.Mock).mockResolvedValue(
        mockFrames,
      );

      (mockVideoProcessor.compressFrames as jest.Mock).mockResolvedValue(
        mockZipBuffer,
      );

      (mockFileStorageUseCase.storeBuffer as jest.Mock).mockResolvedValue(
        '/path',
      );

      await consumer.process(mockJob);

      expect(mockVideoRepository.updateStatus).toHaveBeenCalledWith(
        'video-123',
        VideoStatus.COMPLETED,
      );
    });

    it('should extract frames from video buffer', async () => {
      const mockJob = {
        id: 'job-4',
        data: baseJobData,
        updateProgress: jest.fn(),
      } as unknown as Job;

      const mockVideoBuffer = Buffer.from('video');
      const mockFrames = [
        { name: 'frame-001.png', data: Buffer.from('f1') },
        { name: 'frame-002.png', data: Buffer.from('f2') },
      ];

      (mockFileStorageUseCase.getFile as jest.Mock).mockResolvedValue({
        body: mockVideoBuffer,
      });

      (mockVideoProcessor.extractFrames as jest.Mock).mockResolvedValue(
        mockFrames,
      );

      (mockVideoProcessor.compressFrames as jest.Mock).mockResolvedValue(
        Buffer.from('zip'),
      );

      (mockFileStorageUseCase.storeBuffer as jest.Mock).mockResolvedValue(
        '/path',
      );

      await consumer.process(mockJob);

      expect(mockVideoProcessor.extractFrames).toHaveBeenCalledWith(
        mockVideoBuffer,
      );
    });

    it('should compress frames after extraction', async () => {
      const mockJob = {
        id: 'job-5',
        data: baseJobData,
        updateProgress: jest.fn(),
      } as unknown as Job;

      const mockVideoBuffer = Buffer.from('video');
      const mockFrames = [
        { name: 'frame-001.png', data: Buffer.from('f1') },
        { name: 'frame-002.png', data: Buffer.from('f2') },
      ];
      const mockZipBuffer = Buffer.from('compressed');

      (mockFileStorageUseCase.getFile as jest.Mock).mockResolvedValue({
        body: mockVideoBuffer,
      });

      (mockVideoProcessor.extractFrames as jest.Mock).mockResolvedValue(
        mockFrames,
      );

      (mockVideoProcessor.compressFrames as jest.Mock).mockResolvedValue(
        mockZipBuffer,
      );

      (mockFileStorageUseCase.storeBuffer as jest.Mock).mockResolvedValue(
        '/path',
      );

      await consumer.process(mockJob);

      expect(mockVideoProcessor.compressFrames).toHaveBeenCalledWith(
        mockFrames,
      );
    });

    it('should update job progress at multiple stages', async () => {
      const mockJob = {
        id: 'job-6',
        data: baseJobData,
        updateProgress: jest.fn(),
      } as unknown as Job;

      const mockVideoBuffer = Buffer.from('video');
      const mockFrames = [{ name: 'frame.png', data: Buffer.from('f') }];

      (mockFileStorageUseCase.getFile as jest.Mock).mockResolvedValue({
        body: mockVideoBuffer,
      });

      (mockVideoProcessor.extractFrames as jest.Mock).mockResolvedValue(
        mockFrames,
      );

      (mockVideoProcessor.compressFrames as jest.Mock).mockResolvedValue(
        Buffer.from('zip'),
      );

      (mockFileStorageUseCase.storeBuffer as jest.Mock).mockResolvedValue(
        '/path',
      );

      await consumer.process(mockJob);

      expect(mockJob.updateProgress).toHaveBeenCalledWith(10);
      expect(mockJob.updateProgress).toHaveBeenCalledWith(60);
      expect(mockJob.updateProgress).toHaveBeenCalledWith(80);
      expect(mockJob.updateProgress).toHaveBeenCalledWith(100);
    });

    it('should store compressed frames as zip file', async () => {
      const mockJob = {
        id: 'job-7',
        data: baseJobData,
        updateProgress: jest.fn(),
      } as unknown as Job;

      const mockVideoBuffer = Buffer.from('video');
      const mockFrames = [{ name: 'frame.png', data: Buffer.from('f') }];
      const mockZipBuffer = Buffer.from('zip data');

      (mockFileStorageUseCase.getFile as jest.Mock).mockResolvedValue({
        body: mockVideoBuffer,
      });

      (mockVideoProcessor.extractFrames as jest.Mock).mockResolvedValue(
        mockFrames,
      );

      (mockVideoProcessor.compressFrames as jest.Mock).mockResolvedValue(
        mockZipBuffer,
      );

      (mockFileStorageUseCase.storeBuffer as jest.Mock).mockResolvedValue(
        '/stored/path',
      );

      await consumer.process(mockJob);

      expect(mockFileStorageUseCase.storeBuffer).toHaveBeenCalledWith(
        mockZipBuffer,
        expect.stringContaining('/output.zip'),
        'application/zip',
      );
    });

    it('should handle error when video file not found', async () => {
      const mockJob = {
        id: 'job-8',
        data: baseJobData,
        updateProgress: jest.fn(),
      } as unknown as Job;

      (mockFileStorageUseCase.getFile as jest.Mock).mockResolvedValue({
        body: null,
      });

      await expect(consumer.process(mockJob)).rejects.toThrow(
        'Arquivo de vídeo não encontrado ou vazio',
      );
    });

    it('should update status to ERROR on processing failure', async () => {
      const mockJob = {
        id: 'job-9',
        data: baseJobData,
        updateProgress: jest.fn(),
      } as unknown as Job;

      const mockVideoBuffer = Buffer.from('bad video');

      (mockFileStorageUseCase.getFile as jest.Mock).mockResolvedValue({
        body: mockVideoBuffer,
      });

      (mockVideoProcessor.extractFrames as jest.Mock).mockRejectedValue(
        new Error('FFmpeg error'),
      );

      await expect(consumer.process(mockJob)).rejects.toThrow();

      expect(mockVideoRepository.updateStatus).toHaveBeenCalledWith(
        'video-123',
        VideoStatus.ERROR,
      );
    });

    it('should propagate error message on failure', async () => {
      const mockJob = {
        id: 'job-10',
        data: baseJobData,
        updateProgress: jest.fn(),
      } as unknown as Job;

      const errorMessage = 'Critical processing error';

      (mockFileStorageUseCase.getFile as jest.Mock).mockResolvedValue({
        body: Buffer.from('video'),
      });

      (mockVideoProcessor.extractFrames as jest.Mock).mockRejectedValue(
        new Error(errorMessage),
      );

      await expect(consumer.process(mockJob)).rejects.toThrow(
        'Erro no processamento do vídeo: Critical processing error',
      );
    });

    it('should use configured output file name', async () => {
      const mockJob = {
        id: 'job-11',
        data: baseJobData,
        updateProgress: jest.fn(),
      } as unknown as Job;

      const mockVideoBuffer = Buffer.from('video');
      const mockFrames = [{ name: 'frame.png', data: Buffer.from('f') }];

      (mockFileStorageUseCase.getFile as jest.Mock).mockResolvedValue({
        body: mockVideoBuffer,
      });

      (mockVideoProcessor.extractFrames as jest.Mock).mockResolvedValue(
        mockFrames,
      );

      (mockVideoProcessor.compressFrames as jest.Mock).mockResolvedValue(
        Buffer.from('zip'),
      );

      (mockFileStorageUseCase.storeBuffer as jest.Mock).mockResolvedValue(
        '/path',
      );

      const result = await consumer.process(mockJob);

      expect(result.fileName).toBe('output.zip');
    });

    it('should construct correct storage paths', async () => {
      const mockJob = {
        id: 'job-12',
        data: {
          videoId: 'vid-abc',
          userId: 'user-xyz',
          originalName: 'test-video.mp4',
          timestamp: 1234567890,
        },
        updateProgress: jest.fn(),
      } as unknown as Job;

      const mockVideoBuffer = Buffer.from('video');
      const mockFrames = [{ name: 'frame.png', data: Buffer.from('f') }];

      (mockFileStorageUseCase.getFile as jest.Mock).mockResolvedValue({
        body: mockVideoBuffer,
      });

      (mockVideoProcessor.extractFrames as jest.Mock).mockResolvedValue(
        mockFrames,
      );

      (mockVideoProcessor.compressFrames as jest.Mock).mockResolvedValue(
        Buffer.from('zip'),
      );

      (mockFileStorageUseCase.storeBuffer as jest.Mock).mockResolvedValue(
        '/path',
      );

      await consumer.process(mockJob);

      expect(mockFileStorageUseCase.getFile).toHaveBeenCalledWith(
        'user-xyz/vid-abc/test-video.mp4',
      );

      // Verify that storeBuffer was called with paths containing the user and video IDs
      const storeBufferCall = (
        mockFileStorageUseCase.storeBuffer as jest.Mock
      ).mock.calls[0];
      expect(storeBufferCall[1]).toContain('user-xyz/vid-abc');
      expect(storeBufferCall[1]).toContain('output.zip');
      expect(storeBufferCall[2]).toBe('application/zip');
    });

    it('should handle unknown error type', async () => {
      const mockJob = {
        id: 'job-13',
        data: baseJobData,
        updateProgress: jest.fn(),
      } as unknown as Job;

      (mockFileStorageUseCase.getFile as jest.Mock).mockResolvedValue({
        body: Buffer.from('video'),
      });

      (mockVideoProcessor.extractFrames as jest.Mock).mockRejectedValue('Unknown error');

      await expect(consumer.process(mockJob)).rejects.toThrow(
        'Erro no processamento do vídeo: Unknown error',
      );
    });

    it('should complete all processing steps in correct order', async () => {
      const mockJob = {
        id: 'job-14',
        data: baseJobData,
        updateProgress: jest.fn(),
      } as unknown as Job;

      const callStack: string[] = [];

      (mockFileStorageUseCase.getFile as jest.Mock).mockImplementation(() => {
        callStack.push('getFile');
        return Promise.resolve({ body: Buffer.from('video') });
      });

      (mockVideoRepository.updateStatus as jest.Mock).mockImplementation(
        (id, status) => {
          if (status === VideoStatus.PROCESSING) {
            callStack.push('updateStatus:PROCESSING');
          } else {
            callStack.push('updateStatus:COMPLETED');
          }
        },
      );

      (mockVideoProcessor.extractFrames as jest.Mock).mockImplementation(() => {
        callStack.push('extractFrames');
        return Promise.resolve([
          { name: 'frame.png', data: Buffer.from('f') },
        ]);
      });

      (mockVideoProcessor.compressFrames as jest.Mock).mockImplementation(() => {
        callStack.push('compressFrames');
        return Promise.resolve(Buffer.from('zip'));
      });

      (mockFileStorageUseCase.storeBuffer as jest.Mock).mockImplementation(() => {
        callStack.push('storeBuffer');
        return Promise.resolve('/path');
      });

      await consumer.process(mockJob);

      expect(callStack[0]).toBe('getFile');
      expect(callStack[1]).toBe('updateStatus:PROCESSING');
      expect(callStack[2]).toBe('extractFrames');
      expect(callStack[3]).toBe('compressFrames');
      expect(callStack[4]).toBe('storeBuffer');
      expect(callStack[5]).toBe('updateStatus:COMPLETED');
    });
  });
});