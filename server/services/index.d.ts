export namespace EntityService {
  export interface Entity {
    id: number;
    locale?: string;
    localizations?: Entity[];
  }
}

export namespace DatabaseService {
  export type RelationFieldInput =
    | {
        connect: number | number[];
      }
    | {
        id: number;
      }
    | number;
}
