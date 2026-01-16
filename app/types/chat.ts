import type { JSONValue, UIMessage } from 'ai';
import type { ProgressAnnotation, ToolCallAnnotation } from '~/types/context';

export type ChatMessageMetadata = {
  annotations?: JSONValue[];
};

export type ChatDataTypes = {
  progress: ProgressAnnotation;
  toolCall: ToolCallAnnotation;
};

type BaseChatMessage = UIMessage<ChatMessageMetadata, ChatDataTypes>;

export type ChatMessage = Omit<BaseChatMessage, 'parts'> & {
  parts?: BaseChatMessage['parts'];
  content?: string | Array<{ type: string; text?: string; image?: string }>;
  annotations?: JSONValue[];
};
