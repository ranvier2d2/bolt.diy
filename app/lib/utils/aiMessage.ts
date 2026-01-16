import type { FileUIPart, TextUIPart, UIMessage } from 'ai';

type MessagePart = UIMessage['parts'][number];

export function getTextFromParts(parts: Array<MessagePart> | undefined): string {
  if (!parts) {
    return '';
  }

  return parts
    .filter((part): part is TextUIPart => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

export function getTextFromMessage(message: Pick<UIMessage, 'parts'>): string {
  return getTextFromParts(message.parts);
}

export function getFilePartsFromParts(parts: Array<MessagePart> | undefined): FileUIPart[] {
  if (!parts) {
    return [];
  }

  return parts.filter((part): part is FileUIPart => part.type === 'file');
}
