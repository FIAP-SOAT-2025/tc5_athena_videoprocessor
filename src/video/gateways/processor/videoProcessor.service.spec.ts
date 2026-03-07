jest.mock('fluent-ffmpeg', () => {
  const mockFfmpeg = jest.fn(() => ({
    fps: jest.fn().mockReturnThis(),
    output: jest.fn().mockReturnThis(),
    on: jest.fn(function (event, callback) {
      if (event === 'end') {
        setTimeout(() => callback(), 0);
      }
      return this;
    }),
    run: jest.fn(),
  }));
  mockFfmpeg.setFfmpegPath = jest.fn();
  return mockFfmpeg;
});

jest.mock('archiver', () => {
  return jest.fn(() => {
    const EventEmitter = require('events').EventEmitter;
    const archiver = new EventEmitter();
    archiver.append = jest.fn();
    archiver.finalize = jest.fn(() => {
      setTimeout(() => archiver.emit('data', Buffer.from('test')), 0);
      setTimeout(() => archiver.emit('end'), 10);
    });
    return archiver;
  });
});

jest.mock('@ffmpeg-installer/ffmpeg', () => ({
  path: '/mock/ffmpeg/path',
}));

import { VideoProcessorService } from './videoProcessor.service';
import { FrameFile } from '../videoProcessor';

describe('VideoProcessorService', () => {
  let service: VideoProcessorService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new VideoProcessorService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have extractFrames method', () => {
    expect(typeof service.extractFrames).toBe('function');
  });

  it('should have compressFrames method', () => {
    expect(typeof service.compressFrames).toBe('function');
  });

  describe('extractFrames', () => {
    it('should have correct method signature', () => {
      expect(service.extractFrames.length).toBe(1);
    });

    it('should return Promise', () => {
      const buffer = Buffer.from('test');
      const result = service.extractFrames(buffer);
      expect(result instanceof Promise).toBe(true);
    });
  });

  describe('compressFrames', () => {
    it('should have correct method signature', () => {
      expect(service.compressFrames.length).toBe(1);
    });

    it('should return Promise', () => {
      const frames: FrameFile[] = [];
      const result = service.compressFrames(frames);
      expect(result instanceof Promise).toBe(true);
    });

    it('should accept empty frame array', async () => {
      const frames: FrameFile[] = [];
      const result = await service.compressFrames(frames);
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should accept frames with data', async () => {
      const frames: FrameFile[] = [
        { name: 'frame-001.png', data: Buffer.from('frame1') },
        { name: 'frame-002.png', data: Buffer.from('frame2') },
      ];
      const result = await service.compressFrames(frames);
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });
});