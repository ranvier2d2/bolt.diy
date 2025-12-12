# Devin Bidirectional Integration Design Document

This document outlines the design for enabling bidirectional communication between bolt.diy and Devin, allowing Devin to call back into bolt.diy to access project context.

## Current Implementation (Phase 1)

The current implementation provides **bolt.diy → Devin** communication via MCP tools:

- `devin_create_session`: Create a new Devin session with a prompt
- `devin_send_message`: Send follow-up messages to active sessions
- `devin_get_status`: Get session status and structured output

## Proposed Bidirectional Integration (Phase 2)

### Overview

Phase 2 would enable **Devin → bolt.diy** communication, allowing Devin to:
1. Request current project context from bolt.diy
2. Receive file modifications and chat history
3. Apply suggested changes back to the project

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         bolt.diy                                 │
│  ┌─────────────────┐    ┌─────────────────┐                     │
│  │  WorkbenchStore │    │    chatStore    │                     │
│  │  - FilesStore   │    │  - messages     │                     │
│  │  - EditorStore  │    │  - history      │                     │
│  │  - TerminalStore│    │                 │                     │
│  └────────┬────────┘    └────────┬────────┘                     │
│           │                      │                               │
│           └──────────┬───────────┘                               │
│                      ▼                                           │
│           ┌─────────────────────┐                               │
│           │  ContextAggregator  │                               │
│           │  - collectContext() │                               │
│           │  - sanitizeSecrets()│                               │
│           │  - summarize()      │                               │
│           └──────────┬──────────┘                               │
│                      │                                           │
│                      ▼                                           │
│           ┌─────────────────────┐                               │
│           │  MCP Server Endpoint│                               │
│           │  /api/mcp/context   │                               │
│           └──────────┬──────────┘                               │
│                      │                                           │
└──────────────────────┼───────────────────────────────────────────┘
                       │
                       ▼ MCP Protocol
┌──────────────────────┴───────────────────────────────────────────┐
│                         Devin                                     │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Devin can call:                                             │ │
│  │  - share_context_with_devin: Get current project state       │ │
│  │  - get_file_contents: Read specific files                    │ │
│  │  - get_chat_history: Get conversation context                │ │
│  │  - apply_changes: Suggest file modifications                 │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### ContextAggregator Component

The ContextAggregator would be responsible for collecting and sanitizing project state:

```typescript
interface ProjectContext {
  files: {
    path: string;
    content: string;
    isModified: boolean;
  }[];
  chatSummary: string;
  recentMessages: Message[];
  mcpTools: string[];
  connections: {
    github?: boolean;
    gitlab?: boolean;
    supabase?: boolean;
    vercel?: boolean;
    netlify?: boolean;
  };
  previewUrls: string[];
  metadata: {
    timestamp: string;
    projectName?: string;
  };
}

class ContextAggregator {
  collectContext(options: {
    includeFiles?: boolean;
    includeChatHistory?: boolean;
    includeTerminalOutput?: boolean;
    maxFiles?: number;
    maxChatMessages?: number;
  }): Promise<ProjectContext>;
  
  sanitizeSecrets(context: ProjectContext): ProjectContext;
  
  summarize(context: ProjectContext): Promise<string>;
}
```

### Proposed MCP Tools for Devin

#### 1. `share_context_with_devin`

Allows Devin to request the current project context:

```typescript
{
  name: "share_context_with_devin",
  description: "Share current project context with Devin for analysis",
  parameters: {
    includeFiles: z.boolean().default(true),
    includeChatHistory: z.boolean().default(true),
    includeTerminalOutput: z.boolean().default(false),
    maxFiles: z.number().default(50),
  }
}
```

#### 2. `get_file_contents`

Allows Devin to read specific files:

```typescript
{
  name: "get_file_contents",
  description: "Get the contents of specific files in the project",
  parameters: {
    paths: z.array(z.string()),
  }
}
```

#### 3. `apply_devin_changes`

Allows Devin to suggest file modifications:

```typescript
{
  name: "apply_devin_changes",
  description: "Apply file changes suggested by Devin",
  parameters: {
    changes: z.array(z.object({
      path: z.string(),
      content: z.string(),
      operation: z.enum(["create", "update", "delete"]),
    })),
    message: z.string().optional(),
  }
}
```

### Security Considerations

1. **Secret Sanitization**: The ContextAggregator must sanitize all secrets before sharing:
   - API keys from cookies
   - Environment variables
   - `.env` file contents
   - Connection credentials

2. **Rate Limiting**: Implement rate limiting on context sharing endpoints to prevent abuse.

3. **Authentication**: Ensure only authenticated Devin sessions can request context.

4. **User Approval**: Consider requiring user approval before sharing context with Devin.

### Implementation Steps

1. **Create ContextAggregator service** (`app/lib/services/contextAggregator.ts`)
   - Implement `collectContext()` method
   - Implement `sanitizeSecrets()` method
   - Reuse existing `createSummary()` and `selectContext()` functions

2. **Create MCP server endpoint** (`app/routes/api.mcp.context.ts`)
   - Expose tools for Devin to call
   - Handle authentication and rate limiting

3. **Update Devin session creation**
   - Pass bolt.diy context endpoint URL to Devin
   - Configure Devin to use bolt.diy as an MCP server

4. **Add UI for context sharing**
   - "Share Context with Devin" button in header/chat
   - Settings for what to include in context
   - Approval flow for applying Devin's suggested changes

### State Access Points

| Store | Method | Use Case |
|-------|--------|----------|
| WorkbenchStore | `getFileModifications()` | Get file diffs |
| WorkbenchStore | `getModifiedFiles()` | List changed files |
| WorkbenchStore | `downloadZip()` | Package project |
| FilesStore | `files` | Get all file contents |
| chatStore | `messages` | Get chat history |
| useMCPStore | `serverTools` | Get available tools |

### Future Enhancements

1. **Real-time Sync**: WebSocket connection for real-time context updates
2. **Selective Sharing**: Fine-grained control over what context to share
3. **Change Preview**: Preview Devin's suggested changes before applying
4. **Rollback Support**: Ability to undo Devin's applied changes
5. **Collaborative Mode**: Multiple Devin sessions working on different parts

---

*This document is for planning purposes only. Implementation should be done in a future session.*
