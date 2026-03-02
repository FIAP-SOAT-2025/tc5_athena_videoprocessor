export enum VideoStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

export class Video {
  id: string;
  size: number;
  file_name: string;
  extension: string;
  status: VideoStatus;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}
