import { INestApplication } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { Queue } from 'bullmq';

export class BullBoardSetup {
  static configure(app: INestApplication) {
    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath('/admin/queues');

    const videoQueue = app.get<Queue>(getQueueToken('video-processing'));

    createBullBoard({
      queues: [new BullMQAdapter(videoQueue)],
      serverAdapter,
    });

    app.use('/admin/queues', serverAdapter.getRouter());
    
    return serverAdapter;
  }
}