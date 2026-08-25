export abstract class Service<TRepository> {
  protected constructor(protected readonly repository: TRepository) {}
}
