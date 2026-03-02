import { Module } from '@nestjs/common';
import { VideoModule } from './video/video.module';
import { StorageModule } from './storage/storage.module';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

@Module({
  imports: [
    PrometheusModule.register(),
    VideoModule,
    StorageModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
