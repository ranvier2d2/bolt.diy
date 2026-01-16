import type { JSONValue, LanguageModel, Tool, UIMessage } from 'ai';

declare module 'ai' {
  interface UIMessage {
    content?: string | Array<{ type: 'text'; text?: string; image?: string }>;
    annotations?: JSONValue[];
    createdAt?: Date;
  }

  type Message = UIMessage;
  type CoreTool<INPUT = any, OUTPUT = any> = Tool<INPUT, OUTPUT>;
  type LanguageModelV1 = LanguageModel;
}
