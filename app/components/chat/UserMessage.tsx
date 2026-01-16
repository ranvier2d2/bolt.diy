/*
 * @ts-nocheck
 * Preventing TS checks with files presented in the video for a better presentation.
 */
import { MODEL_REGEX, PROVIDER_REGEX } from '~/utils/constants';
import { Markdown } from './Markdown';
import { useStore } from '@nanostores/react';
import { profileStore } from '~/lib/stores/profile';
import type {
  DynamicToolUIPart,
  FileUIPart,
  ReasoningUIPart,
  SourceDocumentUIPart,
  SourceUrlUIPart,
  StepStartUIPart,
  TextUIPart,
  ToolUIPart,
} from 'ai';

interface UserMessageProps {
  content: string | Array<{ type: string; text?: string; image?: string }>;
  parts:
    | (
        | TextUIPart
        | ReasoningUIPart
        | ToolUIPart
        | DynamicToolUIPart
        | SourceUrlUIPart
        | SourceDocumentUIPart
        | FileUIPart
        | StepStartUIPart
      )[]
    | undefined;
}

export function UserMessage({ content, parts }: UserMessageProps) {
  const profile = useStore(profileStore);

  // Extract images from parts - look for file parts with image mime types
  const images =
    parts?.filter((part): part is FileUIPart => {
      if (part.type !== 'file') {
        return false;
      }

      const legacyPart = part as FileUIPart & { mimeType?: string; data?: string };
      const mediaType = part.mediaType ?? legacyPart.mimeType ?? '';
      return mediaType.startsWith('image/');
    }) || [];

  if (Array.isArray(content)) {
    const textItem = content.find((item) => item.type === 'text');
    const textContent = stripMetadata(textItem?.text || '');

    return (
      <div className="overflow-hidden flex flex-col gap-3 items-center ">
        <div className="flex flex-row items-start justify-center overflow-hidden shrink-0 self-start">
          {profile?.avatar || profile?.username ? (
            <div className="flex items-end gap-2">
              <img
                src={profile.avatar}
                alt={profile?.username || 'User'}
                className="w-[25px] h-[25px] object-cover rounded-full"
                loading="eager"
                decoding="sync"
              />
              <span className="text-bolt-elements-textPrimary text-sm">
                {profile?.username ? profile.username : ''}
              </span>
            </div>
          ) : (
            <div className="i-ph:user-fill text-accent-500 text-2xl" />
          )}
        </div>
        <div className="flex flex-col gap-4 bg-accent-500/10 backdrop-blur-sm p-3 py-3 w-auto rounded-lg mr-auto">
          {textContent && <Markdown html>{textContent}</Markdown>}
          {images.map((item, index) => {
            const legacyItem = item as FileUIPart & { mimeType?: string; data?: string };
            const src =
              item.url ||
              (legacyItem.data && (legacyItem.mimeType || item.mediaType)
                ? `data:${legacyItem.mimeType || item.mediaType};base64,${legacyItem.data}`
                : '');

            if (!src) {
              return null;
            }

            return (
              <img
                key={index}
                src={src}
                alt={`Image ${index + 1}`}
                className="max-w-full h-auto rounded-lg"
                style={{ maxHeight: '512px', objectFit: 'contain' }}
              />
            );
          })}
        </div>
      </div>
    );
  }

  const textContent = stripMetadata(content);

  return (
    <div className="flex flex-col bg-accent-500/10 backdrop-blur-sm px-5 p-3.5 w-auto rounded-lg ml-auto">
      <div className="flex gap-3.5 mb-4">
        {images.map((item, index) => {
          const legacyItem = item as FileUIPart & { mimeType?: string; data?: string };
          const src =
            item.url ||
            (legacyItem.data && (legacyItem.mimeType || item.mediaType)
              ? `data:${legacyItem.mimeType || item.mediaType};base64,${legacyItem.data}`
              : '');

          if (!src) {
            return null;
          }

          return (
            <div key={index} className="relative flex rounded-lg border border-bolt-elements-borderColor overflow-hidden">
              <div className="h-16 w-16 bg-transparent outline-none">
                <img src={src} alt={`Image ${index + 1}`} className="h-full w-full rounded-lg" style={{ objectFit: 'fill' }} />
              </div>
            </div>
          );
        })}
      </div>
      <Markdown html>{textContent}</Markdown>
    </div>
  );
}

function stripMetadata(content: string) {
  const artifactRegex = /<boltArtifact\s+[^>]*>[\s\S]*?<\/boltArtifact>/gm;
  return content.replace(MODEL_REGEX, '').replace(PROVIDER_REGEX, '').replace(artifactRegex, '');
}
