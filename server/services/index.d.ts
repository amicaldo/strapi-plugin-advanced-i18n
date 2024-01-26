export namespace EntityService {
  export interface Entity {
    id: number;
    locale?: string;
    localizations?: Entity[];
  }
}

export namespace DatabaseService {
  export interface EventInfo {
    contentType: ContentType;
    targetIds: number[];
  }

  export type RelationFieldInput =
    | {
        connect: number | number[];
      }
    | {
        id: number;
      }
    | number;
}
