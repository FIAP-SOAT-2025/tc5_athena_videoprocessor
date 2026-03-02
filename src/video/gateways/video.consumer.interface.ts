export interface VideoConsumerInterface {
    process(job: any): Promise<any>;
}