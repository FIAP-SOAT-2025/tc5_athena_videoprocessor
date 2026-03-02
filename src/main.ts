import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { BullBoardSetup } from './video/gateways/queue/queue.monitoring';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.useGlobalPipes(
    new ValidationPipe(),
  );  
  BullBoardSetup.configure(app);
  await app.listen(process.env.PORT ?? 8000);
}
bootstrap();
