import { BullBoardSetup } from './queue.monitoring';
import { INestApplication } from '@nestjs/common';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { getQueueToken } from '@nestjs/bullmq';

jest.mock('@bull-board/api', () => ({
  createBullBoard: jest.fn(),
}));

jest.mock('@bull-board/api/bullMQAdapter', () => ({
  BullMQAdapter: jest.fn(),
}));

jest.mock('@bull-board/express', () => ({
  ExpressAdapter: jest.fn(() => ({
    setBasePath: jest.fn(),
    getRouter: jest.fn(() => ({})),
  })),
}));

jest.mock('@nestjs/bullmq', () => ({
  getQueueToken: jest.fn(() => 'video-processing-token'),
}));

describe('BullBoardSetup', () => {
  let mockApp: INestApplication;
  let mockQueue: any;
  let mockRouter: any;
  let mockServerAdapter: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockRouter = {};
    mockServerAdapter = {
      setBasePath: jest.fn(),
      getRouter: jest.fn(() => mockRouter),
    };

    mockQueue = {
      name: 'video-processing',
    };

    mockApp = {
      get: jest.fn(() => mockQueue),
      use: jest.fn(),
    } as any;

    (ExpressAdapter as jest.Mock).mockReturnValue(mockServerAdapter);
    (createBullBoard as jest.Mock).mockReturnValue(undefined);
    (BullMQAdapter as jest.Mock).mockReturnValue({});
  });

  it('should be defined', () => {
    expect(BullBoardSetup).toBeDefined();
  });

  it('should have a configure method', () => {
    expect(typeof BullBoardSetup.configure).toBe('function');
  });

  it('should create ExpressAdapter instance', () => {
    BullBoardSetup.configure(mockApp);
    expect(ExpressAdapter).toHaveBeenCalled();
  });

  it('should set base path for server adapter', () => {
    BullBoardSetup.configure(mockApp);
    expect(mockServerAdapter.setBasePath).toHaveBeenCalledWith('/admin/queues');
  });

  it('should retrieve video-processing queue from app', () => {
    BullBoardSetup.configure(mockApp);
    expect(mockApp.get).toHaveBeenCalledWith(getQueueToken('video-processing'));
  });

  it('should create BullMQAdapter for the queue', () => {
    BullBoardSetup.configure(mockApp);
    expect(BullMQAdapter).toHaveBeenCalledWith(mockQueue);
  });

  it('should create BullBoard with adapter', () => {
    BullBoardSetup.configure(mockApp);
    expect(createBullBoard).toHaveBeenCalledWith({
      queues: [{}],
      serverAdapter: mockServerAdapter,
    });
  });

  it('should register adapter route in app', () => {
    BullBoardSetup.configure(mockApp);
    expect(mockApp.use).toHaveBeenCalledWith('/admin/queues', mockRouter);
  });

  it('should return server adapter', () => {
    const result = BullBoardSetup.configure(mockApp);
    expect(result).toBe(mockServerAdapter);
  });
});

