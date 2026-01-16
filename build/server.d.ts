import type { ServerBuild } from '@remix-run/cloudflare';

declare const serverBuild: ServerBuild;
export = serverBuild;
