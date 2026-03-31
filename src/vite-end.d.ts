/// <reference types="vite/client" />
declare const GITHUB_RUNTIME_PERMANENT_NAME: string
declare const BASE_KV_SERVICE_URL: string

interface UserInfo {
  login: string;
  avatarUrl: string;
  email: string;
  id: string;
  isOwner: boolean;
}

interface SparkAPI {
  llmPrompt: (strings: TemplateStringsArray, ...values: any[]) => string;
  llm: (prompt: string, modelName?: string, jsonMode?: boolean) => Promise<string>;
  user: () => Promise<UserInfo>;
  kv: {
    keys: () => Promise<string[]>;
    get: <T>(key: string) => Promise<T | undefined>;
    set: <T>(key: string, value: T) => Promise<void>;
    delete: (key: string) => Promise<void>;
  };
}

declare global {
  interface Window {
    spark: SparkAPI;
  }

  const spark: SparkAPI;
}

declare module 'lucide-react/dist/esm/icons/chevron-down';
declare module 'lucide-react/dist/esm/icons/chevron-right';
declare module 'lucide-react/dist/esm/icons/more-horizontal';
declare module 'lucide-react/dist/esm/icons/chevron-left';
declare module 'lucide-react/dist/esm/icons/arrow-left';
declare module 'lucide-react/dist/esm/icons/arrow-right';
declare module 'lucide-react/dist/esm/icons/check';
declare module 'lucide-react/dist/esm/icons/search';
declare module 'lucide-react/dist/esm/icons/circle';
declare module 'lucide-react/dist/esm/icons/x';
declare module 'lucide-react/dist/esm/icons/minus';
declare module 'lucide-react/dist/esm/icons/chevron-up';
declare module 'lucide-react/dist/esm/icons/panel-left';
declare module 'lucide-react/dist/esm/icons/grip-vertical';

export {};