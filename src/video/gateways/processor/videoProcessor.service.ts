import { Injectable } from '@nestjs/common';
import { VideoProcessorInterface, FrameFile } from '../videoProcessor';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import archiver from 'archiver';

@Injectable()
export class VideoProcessorService implements VideoProcessorInterface {
  constructor() {
    ffmpeg.setFfmpegPath(ffmpegPath.path);
  }

  async extractFrames(fileBuffer: Buffer): Promise<FrameFile[]> {
    const tmpDir = path.join(os.tmpdir(), `frames-${Date.now()}`);
    const tmpFile = path.join(os.tmpdir(), `video-${Date.now()}.mp4`);

    await fs.promises.mkdir(tmpDir, { recursive: true });
    await fs.promises.writeFile(tmpFile, fileBuffer);

    await new Promise<void>((resolve, reject) => {
      ffmpeg(tmpFile)
        .fps(1)
        .output(`${tmpDir}/frame-%03d.png`)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });

    await fs.promises.unlink(tmpFile).catch(() => {});

    const files = await fs.promises.readdir(tmpDir);
    const frames: FrameFile[] = await Promise.all(
      files
        .filter((f) => f.endsWith('.png'))
        .sort()
        .map(async (name) => ({
          name,
          data: await fs.promises.readFile(path.join(tmpDir, name)),
        })),
    );

    await fs.promises.rm(tmpDir, { recursive: true, force: true });

    return frames;
  }

  async compressFrames(frames: FrameFile[]): Promise<Buffer> {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      archive.on('data', (chunk: Buffer) => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', (err) => reject(err));

      for (const frame of frames) {
        archive.append(frame.data, { name: frame.name });
      }

      archive.finalize();
    });
  }
}
