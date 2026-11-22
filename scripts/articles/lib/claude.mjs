/**
 * One helper for every model call in the article pipeline.
 * Needs ANTHROPIC_API_KEY (or another credential the SDK picks up).
 *
 * ask({ system, prompt, schema, webSearch, effort, maxTokens })
 *  - schema:    JSON Schema → the answer is parsed JSON (structured outputs)
 *  - webSearch: number of searches allowed (server-side web search + fetch); text answer
 */
import Anthropic from '@anthropic-ai/sdk';

export const MODEL = process.env.ARTICLES_MODEL || 'claude-opus-5-5';
const client = new Anthropic();

export async function ask({ system, prompt, schema, webSearch = 0, effort = 'high', maxTokens = 64000 }) {
  const tools = webSearch
    ? [
        { type: 'web_search_20260209', name: 'web_search', max_uses: webSearch },
        { type: 'web_fetch_20260209', name: 'web_fetch', max_uses: webSearch },
      ]
    : undefined;
  const messages = [{ role: 'user', content: prompt }];

  for (let turn = 0; turn < 8; turn++) {
    const stream = client.beta.messages.stream({
      model: MODEL,
      max_tokens: maxTokens,
      // on a refusal the API retries the same request on a fallback model
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system,
      messages,
      ...(tools ? { tools } : {}),
      output_config: { effort, ...(schema ? { format: { type: 'json_schema', schema } } : {}) },
    });
    const msg = await stream.finalMessage();

    if (msg.stop_reason === 'pause_turn') {
      // a long web-search turn: send it back so the server continues
      messages.push({ role: 'assistant', content: msg.content });
      continue;
    }
    if (msg.stop_reason === 'refusal') throw new Error(`Model declined: ${msg.stop_details?.category ?? 'no category'}`);
    if (msg.stop_reason === 'max_tokens') throw new Error('Answer cut off at max_tokens');

    const text = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
    if (!schema) return text;
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Expected JSON, got: ${text.slice(0, 300)}`);
    }
  }
  throw new Error('Too many paused turns');
}
