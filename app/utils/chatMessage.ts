import type { TextUIPart, UIMessagePart, UITools } from 'ai';
import type { ChatMessage } from '~/types/chat';
import type { ChatDataTypes } from '~/types/chat';

export function getTextFromParts(parts?: UIMessagePart<ChatDataTypes, UITools>[]): string {
  if (!parts) {
    return '';
  }

  return parts
    .filter((part): part is TextUIPart => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

export function getMessageText(message: Pick<ChatMessage, 'content' | 'parts'>): string {
  const { content } = message;

  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .filter((item) => item.type === 'text')
      .map((item) => item.text ?? '')
      .join('');
  }

  return getTextFromParts(message.parts);
}

export function getMessageAnnotations(message: {
  annotations?: ChatMessage['annotations'];
  metadata?: ChatMessage['metadata'];
}) {
  return message.annotations ?? message.metadata?.annotations ?? [];
}
