import { useEffect, useMemo, useState, useCallback } from 'react';
import { classNames } from '~/utils/classNames';
import type { MCPConfig } from '~/lib/services/mcpService';
import { toast } from 'react-toastify';
import { useMCPStore } from '~/lib/stores/mcp';
import McpServerList from '~/components/@settings/tabs/mcp/McpServerList';

const CLAUDE_CODE_SERVER_NAME = 'claude-code';
const CLAUDE_CODE_CONFIG = {
  type: 'stdio' as const,
  command: 'claude',
  args: ['mcp', 'serve'],
};

const EXAMPLE_MCP_CONFIG: MCPConfig = {
  mcpServers: {
    everything: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-everything'],
    },
    deepwiki: {
      type: 'streamable-http',
      url: 'https://mcp.deepwiki.com/mcp',
    },
    'local-sse': {
      type: 'sse',
      url: 'http://localhost:8000/sse',
      headers: {
        Authorization: 'Bearer mytoken123',
      },
    },
  },
};

export default function McpTab() {
  const settings = useMCPStore((state) => state.settings);
  const isInitialized = useMCPStore((state) => state.isInitialized);
  const serverTools = useMCPStore((state) => state.serverTools);
  const initialize = useMCPStore((state) => state.initialize);
  const updateSettings = useMCPStore((state) => state.updateSettings);
  const checkServersAvailabilities = useMCPStore((state) => state.checkServersAvailabilities);

  const [isSaving, setIsSaving] = useState(false);
  const [mcpConfigText, setMCPConfigText] = useState('');
  const [maxLLMSteps, setMaxLLMSteps] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingServers, setIsCheckingServers] = useState(false);
  const [expandedServer, setExpandedServer] = useState<string | null>(null);

  useEffect(() => {
    if (!isInitialized) {
      initialize().catch((err) => {
        setError(`Failed to initialize MCP settings: ${err instanceof Error ? err.message : String(err)}`);
        toast.error('Failed to load MCP configuration');
      });
    }
  }, [isInitialized]);

  useEffect(() => {
    setMCPConfigText(JSON.stringify(settings.mcpConfig, null, 2));
    setMaxLLMSteps(settings.maxLLMSteps);
    setError(null);
  }, [settings]);

  const parsedConfig = useMemo(() => {
    try {
      setError(null);
      return JSON.parse(mcpConfigText) as MCPConfig;
    } catch (e) {
      setError(`Invalid JSON format: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }
  }, [mcpConfigText]);

  const handleMaxLLMCallChange = (value: string) => {
    setMaxLLMSteps(parseInt(value, 10));
  };

  const handleSave = async () => {
    if (!parsedConfig) {
      return;
    }

    setIsSaving(true);

    try {
      await updateSettings({
        mcpConfig: parsedConfig,
        maxLLMSteps,
      });
      toast.success('MCP configuration saved');

      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save configuration');
      toast.error('Failed to save MCP configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadExample = () => {
    setMCPConfigText(JSON.stringify(EXAMPLE_MCP_CONFIG, null, 2));
    setError(null);
  };

  const checkServerAvailability = async () => {
    if (serverEntries.length === 0) {
      return;
    }

    setIsCheckingServers(true);
    setError(null);

    try {
      await checkServersAvailabilities();
    } catch (e) {
      setError(`Failed to check server availability: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsCheckingServers(false);
    }
  };

  const toggleServerExpanded = (serverName: string) => {
    setExpandedServer(expandedServer === serverName ? null : serverName);
  };

  const serverEntries = useMemo(() => Object.entries(serverTools), [serverTools]);

  const isClaudeCodeEnabled = useMemo(() => {
    if (!parsedConfig?.mcpServers) {
      return false;
    }

    return CLAUDE_CODE_SERVER_NAME in parsedConfig.mcpServers;
  }, [parsedConfig]);

  const handleClaudeCodeToggle = useCallback(() => {
    if (!parsedConfig) {
      return;
    }

    const newConfig = { ...parsedConfig };

    if (isClaudeCodeEnabled) {
      const { [CLAUDE_CODE_SERVER_NAME]: _, ...rest } = newConfig.mcpServers;
      newConfig.mcpServers = rest;
    } else {
      newConfig.mcpServers = {
        [CLAUDE_CODE_SERVER_NAME]: CLAUDE_CODE_CONFIG,
        ...newConfig.mcpServers,
      };
    }

    setMCPConfigText(JSON.stringify(newConfig, null, 2));
  }, [parsedConfig]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <section aria-labelledby="presets-heading">
        <h2 id="presets-heading" className="text-base font-medium text-bolt-elements-textPrimary mb-3">
          Presets
        </h2>
        <div className="space-y-3">
          <div
            className={classNames(
              'p-4 rounded-lg border',
              'bg-bolt-elements-background-depth-2',
              'border-bolt-elements-borderColor',
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-bolt-elements-textPrimary">Claude Code</span>
                  <span className="px-1.5 py-0.5 text-xs rounded bg-bolt-elements-background-depth-3 text-bolt-elements-textSecondary">
                    stdio
                  </span>
                </div>
                <p className="text-xs text-bolt-elements-textSecondary mb-2">
                  Use Claude Code CLI as an MCP server. Requires Claude Code CLI installed locally and authenticated.
                </p>
                <p className="text-xs text-bolt-elements-textTertiary">
                  Not used in CI; only runs in your local environment.
                </p>
              </div>
              <button
                onClick={handleClaudeCodeToggle}
                disabled={!parsedConfig}
                className={classNames(
                  'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent',
                  'transition-colors duration-200 ease-in-out',
                  'focus:outline-none focus:ring-2 focus:ring-bolt-elements-focus focus:ring-offset-2',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  isClaudeCodeEnabled
                    ? 'bg-bolt-elements-item-backgroundAccent'
                    : 'bg-bolt-elements-background-depth-4',
                )}
                role="switch"
                aria-checked={isClaudeCodeEnabled}
                aria-label="Toggle Claude Code MCP server"
              >
                <span
                  className={classNames(
                    'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0',
                    'transition duration-200 ease-in-out',
                    isClaudeCodeEnabled ? 'translate-x-5' : 'translate-x-0',
                  )}
                />
              </button>
            </div>
            {isClaudeCodeEnabled && (
              <div className="mt-3 pt-3 border-t border-bolt-elements-borderColor">
                <p className="text-xs text-bolt-elements-textSecondary">
                  <span className="font-medium">Command:</span>{' '}
                  <code className="px-1 py-0.5 rounded bg-bolt-elements-background-depth-3 font-mono">
                    claude mcp serve
                  </code>
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section aria-labelledby="server-status-heading">
        <div className="flex justify-between items-center mb-3">
          <h2 id="server-status-heading" className="text-base font-medium text-bolt-elements-textPrimary">
            MCP Servers Configured
          </h2>{' '}
          <button
            onClick={checkServerAvailability}
            disabled={isCheckingServers || !parsedConfig || serverEntries.length === 0}
            className={classNames(
              'px-3 py-1.5 rounded-lg text-sm',
              'bg-bolt-elements-background-depth-3 hover:bg-bolt-elements-background-depth-4',
              'text-bolt-elements-textPrimary',
              'transition-all duration-200',
              'flex items-center gap-2',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {isCheckingServers ? (
              <div className="i-svg-spinners:90-ring-with-bg w-3 h-3 text-bolt-elements-loader-progress animate-spin" />
            ) : (
              <div className="i-ph:arrow-counter-clockwise w-3 h-3" />
            )}
            Check availability
          </button>
        </div>
        <McpServerList
          checkingServers={isCheckingServers}
          expandedServer={expandedServer}
          serverEntries={serverEntries}
          toggleServerExpanded={toggleServerExpanded}
        />
      </section>

      <section aria-labelledby="config-section-heading">
        <h2 className="text-base font-medium text-bolt-elements-textPrimary mb-3">Configuration</h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="mcp-config" className="block text-sm text-bolt-elements-textSecondary mb-2">
              Configuration JSON
            </label>
            <textarea
              id="mcp-config"
              value={mcpConfigText}
              onChange={(e) => setMCPConfigText(e.target.value)}
              className={classNames(
                'w-full px-3 py-2 rounded-lg text-sm font-mono h-72',
                'bg-[#F8F8F8] dark:bg-[#1A1A1A]',
                'border',
                error ? 'border-bolt-elements-icon-error' : 'border-[#E5E5E5] dark:border-[#333333]',
                'text-bolt-elements-textPrimary',
                'focus:outline-none focus:ring-1 focus:ring-bolt-elements-focus',
              )}
            />
          </div>
          <div>{error && <p className="mt-2 mb-2 text-sm text-bolt-elements-icon-error">{error}</p>}</div>
          <div>
            <label htmlFor="max-llm-steps" className="block text-sm text-bolt-elements-textSecondary mb-2">
              Maximum number of sequential LLM calls (steps)
            </label>
            <input
              id="max-llm-steps"
              type="number"
              placeholder="Maximum number of sequential LLM calls"
              min="1"
              max="20"
              value={maxLLMSteps}
              onChange={(e) => handleMaxLLMCallChange(e.target.value)}
              className="w-full px-3 py-2 text-bolt-elements-textPrimary text-sm rounded-lg bg-white dark:bg-bolt-elements-background-depth-4 border border-bolt-elements-borderColor dark:border-bolt-elements-borderColor-dark focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="mt-2 text-sm text-bolt-elements-textSecondary">
            The MCP configuration format is identical to the one used in Claude Desktop.
            <a
              href="https://modelcontextprotocol.io/examples"
              target="_blank"
              rel="noopener noreferrer"
              className="text-bolt-elements-link hover:underline inline-flex items-center gap-1"
            >
              View example servers
              <div className="i-ph:arrow-square-out w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap justify-between gap-3 mt-6">
        <button
          onClick={handleLoadExample}
          className="px-4 py-2 rounded-lg text-sm border border-bolt-elements-borderColor
                    bg-bolt-elements-background-depth-2 text-bolt-elements-textSecondary
                    hover:bg-bolt-elements-background-depth-3"
        >
          Load Example
        </button>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={isSaving || !parsedConfig}
            aria-disabled={isSaving || !parsedConfig}
            className={classNames(
              'px-4 py-2 rounded-lg text-sm flex items-center gap-2',
              'bg-bolt-elements-item-backgroundAccent text-bolt-elements-item-contentAccent',
              'hover:bg-bolt-elements-item-backgroundActive',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            <div className="i-ph:floppy-disk w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
}
