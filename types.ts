
export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
}

export interface OllamaTagResponse {
  models: OllamaModel[];
}

export interface OpenAIModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

export interface OpenAIModelResponse {
  data: OpenAIModel[];
}

export enum Persona {
  ARCHITECT = 'Architect',
  CODER = 'Coder',
  DEBUGGER = 'Debugger'
}

export interface FileData {
  name: string;
  content: string;
  language: string;
  isSystem?: boolean; // Pour .assistantrules
}

export interface Project {
  id: string;
  name: string;
  lastModified: number;
  files: FileData[];
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  image?: string; // Base64 image data
  thinking?: string; // Pour le mode Chain of Thought
  timestamp: number;
}

export type AiProvider = 'ollama' | 'openai';

export interface Settings {
  // Config Provider
  provider: AiProvider;
  connection: {
    baseUrl: string;
    apiKey?: string; // Optionnel pour Ollama
  };
  
  // Config IA
  model: string;
  persona: Persona;
  thinkingMode: boolean;
  
  // Config App
  privacyMode: boolean;
  autoTest: boolean;

  // Config GitHub (Optionnel)
  github?: {
    token: string;
    repo: string; // format: username/repo
    branch?: string;
  };
}

export interface TerminalLog {
  id: string;
  type: 'info' | 'error' | 'success' | 'warning';
  message: string;
  timestamp: string;
}

// Nouvelle interface pour le versioning
export interface CodeVersion {
  number: number;
  description: string; // Le prompt qui a généré cette version
  code: string;
  timestamp: number;
}

// Interface pour le fichier de sauvegarde complet (.vibe / .json)
export interface ProjectBackup {
    version: 1;
    timestamp: number;
    project: Project;
    chatHistory: ChatMessage[];
    versions: CodeVersion[];
    settings: Settings;
    logs: TerminalLog[];
}
