export enum GatewayMode {
  NORMALIZATION = 'NORMALIZATION',
  CORS_PROXY = 'CORS_PROXY',
  DEBUG_ANALYSIS = 'DEBUG_ANALYSIS'
}

export enum OutputFormat {
  JSON = 'JSON',
  JS_WORKER = 'JS_WORKER',
  CURL = 'CURL',
  N8N_WORKFLOW = 'N8N_WORKFLOW'
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface SimulatedRequest {
  method: HttpMethod;
  path: string;
  headers: string; // Stored as string for editing
  body: string;
}

export interface ProcessingResult {
  rawOutput: string;
  parsedJson?: any;
  isError: boolean;
  timestamp: string;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  mode: GatewayMode;
  format: OutputFormat;
  inputSnippet: string;
  status: 'SUCCESS' | 'ERROR';
}
