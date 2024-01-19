export namespace EntityService {
  export interface Entity {
    id: number;
    locale?: string;
    localizations?: Entity[];
  }
}
