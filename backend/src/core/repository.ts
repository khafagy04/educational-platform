export abstract class Repository<TClient> {
  protected constructor(protected readonly client: TClient) {}
}
