export interface FrameFile {
  name: string;
  data: Buffer;
}

export interface VideoProcessorInterface {
  extractFrames(fileBuffer: Buffer): Promise<FrameFile[]>;
  compressFrames(frames: FrameFile[]): Promise<Buffer>;
}
