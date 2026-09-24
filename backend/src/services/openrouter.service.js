import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import { SYSTEM_PROMPT, buildUserPrompt, parseModelJson, ROLE_ANALYST } from './openrouter.prompts.js';
import { validateAnalysisResult } from './analysis.validator.js';

const REQUEST_TIMEOUT_MS = 60_000;

/**
 * Call OpenRouter chat completions and return parsed JSON content.
 * The API key never leaves this module.
 */
async function chatCompletion({ system, user, temperature = 0.2, maxTokens = 4000 }) {
  if (!env.OPENROUTER_API_KEY) {
    throw new ApiError(
      503,
      'Analysis is unavailable: OPENROUTER_API_KEY is not configured on the server.',
      { code: 'MISSING_API_KEY' }
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(`${env.OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': env.CLIENT_URL,
        'X-Title': 'VeriWrite AI',
      },
      body: JSON.stringify({
        model: env.OPENROUTER_MODEL,
        temperature,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ApiError(
        504,
        'The analysis service took too long to respond. Please try again.',
        { code: 'AI_TIMEOUT' }
      );
    }
    throw new ApiError(
      502,
      'Could not reach the analysis service. Check the server network connection and try again.',
      { code: 'AI_NETWORK_ERROR' }
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw await toApiError(response);
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError(502, 'The analysis service returned an unreadable response.', {
      code: 'AI_BAD_RESPONSE',
    });
  }

  const content = payload?.choices?.[0]?.message?.content;
  if (!content) {
    throw new ApiError(502, 'The analysis service returned no content.', {
      code: 'AI_EMPTY_RESPONSE',
      model: payload?.model,
    });
  }

  return { content, model: payload?.model || env.OPENROUTER_MODEL, usage: payload?.usage };
}

async function toApiError(response) {
  let detail = '';
  try {
    const body = await response.json();
    detail = body?.error?.message || body?.message || '';
  } catch {
    detail = await response.text().catch(() => '');
  }

  const short = detail ? ` ${detail.slice(0, 200)}` : '';

  switch (response.status) {
    case 401:
      return new ApiError(
        503,
        'Analysis is unavailable: the OpenRouter API key was rejected.',
        { code: 'AI_UNAUTHORIZED' }
      );
    case 402:
      return new ApiError(503, 'Analysis is unavailable: the OpenRouter account has no credits.', {
        code: 'AI_NO_CREDITS',
      });
    case 403:
      return new ApiError(503, 'Analysis is unavailable: OpenRouter denied the request.', {
        code: 'AI_FORBIDDEN',
      });
    case 404:
      return new ApiError(
        503,
        `Analysis is unavailable: model "${env.OPENROUTER_MODEL}" was not found on OpenRouter.`,
        { code: 'AI_MODEL_NOT_FOUND' }
      );
    case 429:
      return new ApiError(429, 'The analysis service is rate-limited right now. Please retry shortly.', {
        code: 'AI_RATE_LIMITED',
      });
    default:
      return new ApiError(
        502,
        `The analysis service returned an error (${response.status}).${short}`,
        { code: 'AI_UPSTREAM_ERROR' }
      );
  }
}

/**
 * Full pipeline: send sections to OpenRouter, parse, validate.
 * Throws ApiError with a human-readable message on any failure.
 */
export async function analyzeAssignment({ sections, sectionsPrompt, fileName, wordCount }) {
  const { content, model, usage } = await chatCompletion({
    system: SYSTEM_PROMPT,
    user: buildUserPrompt({ fileName, wordCount, sectionsPrompt }),
  });

  let parsed;
  try {
    parsed = parseModelJson(content);
  } catch (err) {
    throw new ApiError(
      502,
      `The analysis service returned a malformed report. Please try again. (${err.message})`,
      { code: 'AI_PARSE_ERROR' }
    );
  }

  const validation = validateAnalysisResult(parsed, sections);

  if (!validation.ok) {
    throw new ApiError(
      502,
      `The analysis service returned an incomplete report: ${validation.errors.join('; ')}. Please try again.`,
      { code: 'AI_SCHEMA_ERROR' }
    );
  }

  return {
    report: validation.value,
    model,
    usage,
    providerRole: ROLE_ANALYST,
  };
}

export { chatCompletion };
