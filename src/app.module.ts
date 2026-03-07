import { Module } from '@nestjs/common';
import { VideoModule } from './video/video.module';
import { StorageModule } from './storage/storage.module';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    PrometheusModule.register(),
    VideoModule,
    StorageModule,
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
