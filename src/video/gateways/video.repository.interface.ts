import { Video } from "../domain/video.entity";

export interface videoRepositoryInterface {
  create(video: Video): Promise<Video>;
  findById(id: string): Promise<Video | null>;
}
