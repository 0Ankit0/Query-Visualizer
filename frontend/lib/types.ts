export type Dialect = "postgres" | "sql";

export interface QueryRequest {
  query: string;
  dialect: Dialect;
}

export interface ValidationResponse {
  dialect: Dialect;
  is_valid: boolean;
  normalized_query?: string | null;
  errors: string[];
}

export interface ParseResponse {
  dialect: Dialect;
  normalized_query: string;
  statement_type: string;
  ast_sql: string;
}

export interface VisualizationStep {
  key: string;
  title: string;
  description: string;
  focus: string;
}

export interface VisualizationResponse {
  dialect: Dialect;
  statement_type: string;
  normalized_query: string;
  steps: VisualizationStep[];
  notes: string[];
}

export interface QueryExample {
  name: string;
  dialect: Dialect;
  query: string;
}

export interface ExamplesResponse {
  examples: QueryExample[];
}

export interface DialectsResponse {
  dialects: Dialect[];
}
