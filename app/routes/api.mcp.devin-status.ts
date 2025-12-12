import { type LoaderFunctionArgs } from '@remix-run/cloudflare';

export async function loader({ context }: LoaderFunctionArgs) {
  const env = context.cloudflare?.env as Env | undefined;
  const apiKey = env?.DEVIN_API_KEY;

  return Response.json({
    available: !!apiKey,
  });
}
