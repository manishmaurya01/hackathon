/**
 * Copyleaks Plagiarism Detection Service
 *
 * Architecture:
 *
 * Authentication:
 *   https://id.copyleaks.com/v3/account/login/api
 *
 * API:
 *   https://api.copyleaks.com
 *
 * Scan:
 *   PUT /v3/scans/submit/file/{scanId}
 *
 * IMPORTANT:
 * - Never use api.copyleaks.com for authentication.
 * - Never use api-sandbox.copyleaks.com.
 * - Sandbox is controlled through properties.sandbox.
 */

import axios from "axios";

/* =========================================================
   CONFIG
   ========================================================= */

const DEFAULT_AUTH_URL = "https://id.copyleaks.com";
const DEFAULT_API_URL = "https://api.copyleaks.com";

let envCache = null;

async function getEnv() {
  if (!envCache) {
    const { default: env } = await import("../config/env.js");
    envCache = env;
  }

  return envCache;
}

async function getAuthUrl() {
  const env = await getEnv();

  return (
    env.COPYLEAKS_AUTH_URL ||
    DEFAULT_AUTH_URL
  ).replace(/\/+$/, "");
}

async function getApiUrl() {
  const env = await getEnv();

  return (
    env.COPYLEAKS_API_URL ||
    DEFAULT_API_URL
  ).replace(/\/+$/, "");
}

async function isSandboxEnabled() {
  const env = await getEnv();

  const value = env.COPYLEAKS_SANDBOX;

  if (typeof value === "boolean") {
    return value;
  }

  return String(value).toLowerCase() === "true";
}

/* =========================================================
   TOKEN CACHE
   ========================================================= */

let tokenCache = {
  token: null,
  expiresAt: 0,
};

/**
 * Copyleaks tokens are valid for 48 hours.
 *
 * We keep a safety buffer and refresh before expiration.
 */
function clearTokenCache() {
  tokenCache = {
    token: null,
    expiresAt: 0,
  };
}

/* =========================================================
   ERROR HELPERS
   ========================================================= */

function getAxiosErrorMessage(error) {
  if (!error) {
    return "Unknown error";
  }

  if (error.response) {
    const status = error.response.status;

    const responseData = error.response.data;

    let detail = "";

    if (typeof responseData === "string") {
      detail = responseData;
    } else if (responseData) {
      try {
        detail = JSON.stringify(responseData);
      } catch {
        detail = "";
      }
    }

    return `${status}${detail ? ` - ${detail}` : ""}`;
  }

  if (error.request) {
    return "No response received from Copyleaks";
  }

  return error.message || "Request failed";
}

function createCopyleaksError(prefix, error) {
  const status = error?.response?.status;

  if (status === 400) {
    return new Error(`${prefix}: Invalid request`);
  }

  if (status === 401) {
    return new Error(`${prefix}: Unauthorized`);
  }

  if (status === 402) {
    return new Error(`${prefix}: Copyleaks credits/billing issue`);
  }

  if (status === 403) {
    return new Error(`${prefix}: Copyleaks access forbidden`);
  }

  if (status === 404) {
    return new Error(`${prefix}: Endpoint or resource not found`);
  }

  if (status === 409) {
    return new Error(`${prefix}: Scan ID already exists`);
  }

  if (status === 429) {
    return new Error(`${prefix}: Copyleaks rate limit exceeded`);
  }

  if (status >= 500) {
    return new Error(`${prefix}: Copyleaks server error (${status})`);
  }

  return new Error(
    `${prefix}: ${getAxiosErrorMessage(error)}`
  );
}

/* =========================================================
   AUTHENTICATION
   ========================================================= */

/**
 * Get Copyleaks access token.
 *
 * Authentication endpoint:
 *
 * POST
 * https://id.copyleaks.com/v3/account/login/api
 */
export async function getAccessToken() {
  const env = await getEnv();

  if (!env.COPYLEAKS_API_KEY) {
    throw new Error(
      "Copyleaks API key is not configured"
    );
  }

  if (!env.COPYLEAKS_EMAIL) {
    throw new Error(
      "Copyleaks email is not configured"
    );
  }

  const now = Date.now();

  /*
   * Reuse existing token.
   *
   * 5 minute safety buffer.
   */
  if (
    tokenCache.token &&
    tokenCache.expiresAt > now + 5 * 60 * 1000
  ) {
    return tokenCache.token;
  }

  const authUrl = await getAuthUrl();

  const endpoint =
    `${authUrl}/v3/account/login/api`;

  try {
    console.log(
      "[Copyleaks] Authenticating..."
    );

    const response = await axios.post(
      endpoint,
      {
        email: env.COPYLEAKS_EMAIL,
        key: env.COPYLEAKS_API_KEY,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout: 15000,
      }
    );

    const token =
      response.data?.access_token ||
      response.data?.accessToken ||
      response.data?.token;

    if (!token) {
      throw new Error(
        "Copyleaks did not return an access token"
      );
    }

    /*
     * Official docs say token is valid for 48 hours.
     * Keep a small safety buffer.
     */
    tokenCache = {
      token,
      expiresAt:
        Date.now() +
        47 * 60 * 60 * 1000,
    };

    console.log(
      "[Copyleaks] Authentication successful"
    );

    return token;
  } catch (error) {
    clearTokenCache();

    console.error(
      "[Copyleaks] Authentication failed:",
      createSafeAuthLog(error)
    );

    throw createCopyleaksError(
      "Copyleaks authentication failed",
      error
    );
  }
}

/**
 * Never print API keys or tokens.
 */
function createSafeAuthLog(error) {
  const status = error?.response?.status;

  if (status) {
    return `HTTP ${status}`;
  }

  if (error?.request) {
    return "No response received";
  }

  return error?.message || "Unknown error";
}

/* =========================================================
   AUTH HEADER
   ========================================================= */

async function getAuthHeader() {
  const token = await getAccessToken();

  return {
    Authorization: `Bearer ${token}`,
  };
}

/* =========================================================
   SCAN ID
   ========================================================= */

/**
 * Copyleaks scan IDs should be unique and reasonably short.
 */
function createScanId(prefix = "plagiarism") {
  const timestamp =
    Date.now().toString(36);

  const random =
    Math.random()
      .toString(36)
      .slice(2, 8);

  return `${prefix}-${timestamp}-${random}`
    .slice(0, 36);
}

/* =========================================================
   TEXT -> BASE64
   ========================================================= */

function textToBase64(text) {
  return Buffer
    .from(text, "utf8")
    .toString("base64");
}

/* =========================================================
   SUBMIT FILE
   ========================================================= */

/**
 * Submit plain text as a .txt file.
 *
 * Current Copyleaks API:
 *
 * PUT
 * /v3/scans/submit/file/{scanId}
 *
 * Copyleaks accepts plain text by Base64 encoding it and
 * submitting it as a text file.
 */

export async function submitScan({
  text,
  fileName = "document.txt",
  webhookUrl,
  scanId = null,
}) {
  if (
    typeof text !== "string" ||
    !text.trim()
  ) {
    throw new Error(
      "Cannot submit empty text to Copyleaks"
    );
  }

  const apiUrl = await getApiUrl();
  const headers = await getAuthHeader();
  const sandbox = await isSandboxEnabled();

  const finalScanId =
    scanId || createScanId();

  const base64 = Buffer
    .from(text, "utf8")
    .toString("base64");

  /*
   * Keep the request minimal.
   *
   * Current Copyleaks API supports:
   * - base64
   * - filename
   * - properties.sandbox
   * - properties.webhooks
   * - properties.scanning.internet
   *
   * Do not send unsupported custom filters.
   */
  const properties = {
    sandbox,

    scanning: {
      internet: true,
    },
  };

  /*
   * Only add webhook when an actual webhook URL
   * has been configured.
   *
   * Do not automatically create localhost webhook URLs.
   */
  if (
    webhookUrl &&
    typeof webhookUrl === "string" &&
    webhookUrl.trim()
  ) {
    properties.webhooks = {
      status: webhookUrl,
    };
  }

  const payload = {
    base64,
    filename: fileName,
    properties,
  };

  const endpoint =
    `${apiUrl}/v3/scans/submit/file/${encodeURIComponent(
      finalScanId
    )}`;

  try {
    console.log(
      `[Copyleaks] Submitting scan: ${finalScanId}`
    );

    const response = await axios.put(
      endpoint,
      payload,
      {
        headers: {
          ...headers,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout: 60000,
      }
    );

    console.log(
      `[Copyleaks] Scan submitted successfully: ${finalScanId}`
    );

    return {
      scanId: finalScanId,
      status: "submitted",
      sandbox,
      ...response.data,
    };

  } catch (error) {
    if (
      error?.response?.status === 401
    ) {
      clearTokenCache();
    }

    /*
     * IMPORTANT:
     * Log the actual Copyleaks response body
     * for 400 errors so we can see exactly which
     * property Copyleaks rejected.
     */
    console.error(
      "[Copyleaks] Scan submission failed"
    );

    console.error(
      "[Copyleaks] Status:",
      error?.response?.status
    );

    console.error(
      "[Copyleaks] Response:",
      JSON.stringify(
        error?.response?.data || {},
        null,
        2
      )
    );

    throw createCopyleaksError(
      "Copyleaks scan submission failed",
      error
    );
  }
}

/* =========================================================
   SAFE API LOG
   ========================================================= */

function createSafeApiLog(error) {
  const status = error?.response?.status;

  if (status) {
    return `HTTP ${status}`;
  }

  if (error?.request) {
    return "No response received";
  }

  return error?.message || "Unknown error";
}

/* =========================================================
   NORMALIZE RESULT
   ========================================================= */

/**
 * Copyleaks current completed scan structure contains:
 *
 * results:
 * {
 *   score: {
 *     aggregatedScore,
 *     identicalWords,
 *     minorChangedWords,
 *     relatedMeaningWords
 *   },
 *   internet: [...]
 * }
 *
 * Normalize this into the application's existing format.
 */
export function parseCopyleaksResults(
  copyleaksResult,
  sections = [],
  wordCount = 0
) {
  if (!copyleaksResult) {
    return createEmptyResult();
  }

  /*
   * Support both:
   *
   * response
   *
   * and:
   *
   * { results: response.results }
   */
  const data =
    copyleaksResult.results
      ? copyleaksResult
      : {
          results: copyleaksResult,
        };

  const results =
    data.results || {};

  const scoreData =
    results.score || {};

  /*
   * Current Copyleaks aggregated score.
   */
  const aggregatedScore =
    Number(
      scoreData.aggregatedScore
    );

  let score = Number.isFinite(
    aggregatedScore
  )
    ? aggregatedScore
    : 0;

  score = Math.max(
    0,
    Math.min(
      100,
      Math.round(score * 100) / 100
    )
  );

  /*
   * Internet matches.
   */
  const internetResults =
    Array.isArray(results.internet)
      ? results.internet
      : [];

  const evidence = [];

  const sourceMap = new Map();

  /*
   * Copyleaks result items generally contain:
   *
   * id
   * title
   * matchedWords
   * url
   * metadata
   */
  for (
    const result of internetResults
  ) {
    const sourceUrl =
      result.url ||
      result.metadata?.finalUrl ||
      result.metadata?.canonicalUrl ||
      "";

    if (!sourceUrl) {
      continue;
    }

    let domain = "";

    try {
      domain =
        new URL(sourceUrl)
          .hostname
          .replace(/^www\./, "");
    } catch {
      domain = "";
    }

    const matchedWords =
      Number(result.matchedWords) || 0;

    /*
     * If Copyleaks gives a direct similarity
     * percentage use it.
     *
     * Otherwise derive an approximate
     * source similarity from matched words
     * against document word count.
     */
    let similarity =
      Number(result.similarity);

    if (!Number.isFinite(similarity)) {
      if (wordCount > 0) {
        similarity =
          (matchedWords / wordCount) *
          100;
      } else {
        similarity = 0;
      }
    }

    similarity = Math.max(
      0,
      Math.min(
        100,
        Math.round(similarity)
      )
    );

    const matchType =
      similarity >= 90
        ? "exact"
        : similarity >= 75
          ? "near-exact"
          : similarity >= 50
            ? "high-similarity"
            : similarity >= 30
              ? "paraphrased"
              : "low";

    /*
     * Try to determine which application
     * section is related to this match.
     *
     * Copyleaks internet results normally do not
     * contain our own section number, so we use
     * the first section as a safe fallback.
     */
    let matchedSection = 1;

    if (
      Array.isArray(sections) &&
      sections.length > 0
    ) {
      matchedSection = 1;
    }

    const sourceTitle =
      result.title ||
      result.metadata?.title ||
      "Unknown Source";

    const evidenceItem = {
      section: matchedSection,

      studentText: "",

      sourceText:
        result.introduction ||
        "",

      sourceUrl,

      sourceTitle,

      sourceDomain: domain,

      similarity,

      matchedWords,

      matchType,

      explanation:
        similarity >= 75
          ? "High textual similarity with source"
          : similarity >= 30
            ? "Moderate textual similarity detected"
            : "Low similarity detected",
    };

    evidence.push(
      evidenceItem
    );

    /*
     * Aggregate source.
     */
    if (!sourceMap.has(sourceUrl)) {
      sourceMap.set(
        sourceUrl,
        {
          title: sourceTitle,
          url: sourceUrl,
          domain,
          matchCount: 0,
          maxSimilarity: 0,
          matchedWords: 0,
        }
      );
    }

    const source =
      sourceMap.get(sourceUrl);

    source.matchCount += 1;

    source.maxSimilarity =
      Math.max(
        source.maxSimilarity,
        similarity
      );

    source.matchedWords +=
      matchedWords;
  }

  const sources =
    Array.from(
      sourceMap.values()
    );

  const highestMatch =
    evidence.length > 0
      ? Math.max(
          ...evidence.map(
            item =>
              item.similarity || 0
          )
        )
      : 0;

  const matchedSections =
    new Set(
      evidence.map(
        item => item.section
      )
    ).size;

  /*
   * IMPORTANT:
   *
   * Prefer Copyleaks' own aggregated score.
   * Do not artificially calculate a completely
   * different plagiarism percentage.
   */
  return {
    score,
    category:
      getSimilarityCategory(score),

    sourcesFound:
      sources.length,

    matchedSections,

    highestMatch,

    sources,

    evidence,

    /*
     * Extra information is useful internally
     * but does not break existing consumers.
     */
    statistics: {
      identicalWords:
        Number(
          scoreData.identicalWords
        ) || 0,

      minorChangedWords:
        Number(
          scoreData.minorChangedWords
        ) || 0,

      relatedMeaningWords:
        Number(
          scoreData.relatedMeaningWords
        ) || 0,
    },
  };
}

/* =========================================================
   EMPTY RESULT
   ========================================================= */

function createEmptyResult() {
  return {
    score: 0,
    category: "Low",
    sourcesFound: 0,
    matchedSections: 0,
    highestMatch: 0,
    sources: [],
    evidence: [],
  };
}

/* =========================================================
   SIMILARITY CATEGORY
   ========================================================= */

export function getSimilarityCategory(
  score
) {
  const numericScore =
    Number(score) || 0;

  if (numericScore <= 15) {
    return "Low";
  }

  if (numericScore <= 30) {
    return "Moderate";
  }

  if (numericScore <= 50) {
    return "High";
  }

  return "Very High";
}

/* =========================================================
   MAIN PLAGIARISM FUNCTION
   ========================================================= */

/**
 * Main application entry point.
 *
 * IMPORTANT:
 * We intentionally do NOT use the old:
 *
 * /v3/education/submit
 *
 * flow.
 *
 * Current API uses:
 *
 * /v3/scans/submit/file/{scanId}
 */

export async function analyzePlagiarismWithCopyleaks({
  sections,
  wordCount,
}) {
  if (
    !Array.isArray(sections) ||
    sections.length === 0
  ) {
    throw new Error(
      "No sections provided for plagiarism analysis"
    );
  }

  const fullText = sections
    .map(section => {
      if (
        typeof section === "string"
      ) {
        return section;
      }

      return section?.text || "";
    })
    .filter(Boolean)
    .join("\n\n")
    .trim();

  if (!fullText) {
    throw new Error(
      "No text available for plagiarism analysis"
    );
  }

  /*
   * Current Copyleaks file submission supports
   * the complete text as Base64.
   *
   * Keep a conservative chunk size for the
   * existing application's large documents.
   */
  const maxChunkSize = 50000;

  const chunks =
    splitTextIntoChunks(
      fullText,
      maxChunkSize
    );

  console.log(
    `[Copyleaks] Analyzing ${chunks.length} chunk(s)`
  );

  /*
   * Submit chunks in parallel.
   *
   * This is much faster than the old sequential
   * submission implementation.
   */
  const submissions =
    await Promise.all(
      chunks.map(
        (chunk, index) =>
          submitScan({
            text: chunk,

            fileName:
              `plagiarism-${index + 1}.txt`,
          })
      )
    );

  /*
   * IMPORTANT:
   *
   * Copyleaks processing is asynchronous.
   *
   * The official API uses webhooks for completion.
   *
   * If the submission response already contains
   * results (which can happen for sandbox/mock
   * responses), parse them immediately.
   *
   * Otherwise return a pending result instead
   * of pretending that plagiarism is 0%.
   */
  const immediateResults =
    submissions.filter(
      submission =>
        submission?.results ||
        submission?.data?.results
    );

  if (
    immediateResults.length ===
    submissions.length
  ) {
    return combineCopyleaksResults(
      immediateResults,
      sections,
      wordCount
    );
  }

  /*
   * If no immediate results exist, the scan is
   * asynchronous and requires the webhook.
   *
   * Do NOT make fake polling requests to old
   * /v3/education/status endpoints.
   */
  const sandbox =
    await isSandboxEnabled();

  if (!sandbox) {
    return {
      score: 0,
      category: "Pending",
      sourcesFound: 0,
      matchedSections: 0,
      highestMatch: 0,
      sources: [],
      evidence: [],
      status: "processing",
      scanIds:
        submissions.map(
          submission =>
            submission.scanId
        ),
      message:
        "Copyleaks scan submitted. Results will be available through the configured webhook.",
    };
  }

  /*
   * Sandbox should normally provide mock results.
   * If it did not, explicitly report processing
   * rather than claiming zero plagiarism.
   */
  return {
    score: 0,
    category: "Pending",
    sourcesFound: 0,
    matchedSections: 0,
    highestMatch: 0,
    sources: [],
    evidence: [],
    status: "processing",
    scanIds:
      submissions.map(
        submission =>
          submission.scanId
      ),
    message:
      "Copyleaks sandbox scan submitted but results are not available in the submission response yet.",
  };
}

/* =========================================================
   COMBINE MULTIPLE SCANS
   ========================================================= */

function combineCopyleaksResults(
  submissions,
  sections,
  wordCount
) {
  const allEvidence = [];
  const sourceMap = new Map();

  let totalScore = 0;
  let scoreCount = 0;

  for (
    const submission of submissions
  ) {
    const parsed =
      parseCopyleaksResults(
        submission,
        sections,
        wordCount
      );

    if (
      Number.isFinite(
        Number(parsed.score)
      )
    ) {
      totalScore +=
        Number(parsed.score);

      scoreCount += 1;
    }

    allEvidence.push(
      ...(parsed.evidence || [])
    );

    for (
      const source of
        parsed.sources || []
    ) {
      if (!source.url) {
        continue;
      }

      if (
        !sourceMap.has(source.url)
      ) {
        sourceMap.set(
          source.url,
          {
            ...source,
          }
        );
      } else {
        const existing =
          sourceMap.get(
            source.url
          );

        existing.matchCount =
          (existing.matchCount || 0) +
          (source.matchCount || 0);

        existing.maxSimilarity =
          Math.max(
            existing.maxSimilarity || 0,
            source.maxSimilarity || 0
          );

        existing.matchedWords =
          (existing.matchedWords || 0) +
          (source.matchedWords || 0);
      }
    }
  }

  const sources =
    Array.from(
      sourceMap.values()
    );

  /*
   * Average the Copyleaks scores across
   * submitted chunks.
   */
  const score =
    scoreCount > 0
      ? Math.round(
          (totalScore /
            scoreCount) *
            100
        ) / 100
      : 0;

  const highestMatch =
    allEvidence.length > 0
      ? Math.max(
          ...allEvidence.map(
            evidence =>
              Number(
                evidence.similarity
              ) || 0
          )
        )
      : 0;

  const matchedSections =
    new Set(
      allEvidence.map(
        evidence =>
          evidence.section
      )
    ).size;

  return {
    score,

    category:
      getSimilarityCategory(
        score
      ),

    sourcesFound:
      sources.length,

    matchedSections,

    highestMatch,

    sources,

    evidence:
      allEvidence,
  };
}

/* =========================================================
   TEXT CHUNKING
   ========================================================= */

function splitTextIntoChunks(
  text,
  maxLength
) {
  if (
    text.length <= maxLength
  ) {
    return [text];
  }

  const chunks = [];

  let start = 0;

  while (
    start < text.length
  ) {
    let end =
      Math.min(
        start + maxLength,
        text.length
      );

    /*
     * Try to end at a paragraph.
     */
    if (
      end < text.length
    ) {
      const paragraphBreak =
        text.lastIndexOf(
          "\n\n",
          end
        );

      if (
        paragraphBreak >
        start + maxLength * 0.5
      ) {
        end =
          paragraphBreak;
      } else {
        /*
         * Otherwise try sentence boundary.
         */
        const sentenceBreak =
          text.lastIndexOf(
            ". ",
            end
          );

        if (
          sentenceBreak >
          start + maxLength * 0.5
        ) {
          end =
            sentenceBreak + 1;
        }
      }
    }

    const chunk =
      text
        .slice(start, end)
        .trim();

    if (chunk) {
      chunks.push(chunk);
    }

    start = end;
  }

  return chunks;
}

/* =========================================================
   TEXT STATISTICS
   ========================================================= */

export function calculateTextStatistics(
  text
) {
  const cleaned =
    String(text || "")
      .replace(/\s+/g, " ")
      .trim();

  const words =
    cleaned
      .split(/\s+/)
      .filter(Boolean);

  const sentences =
    cleaned
      .split(/[.!?]+\s+/)
      .filter(
        sentence =>
          sentence.trim().length > 0
      );

  const paragraphs =
    String(text || "")
      .split(/\n\s*\n/)
      .filter(
        paragraph =>
          paragraph.trim().length > 0
      );

  /*
   * Vocabulary diversity
   */
  const uniqueWords =
    new Set(
      words.map(word =>
        word.toLowerCase()
      )
    );

  const vocabularyDiversity =
    words.length > 0
      ? uniqueWords.size /
        words.length
      : 0;

  /*
   * Sentence lengths
   */
  const sentenceLengths =
    sentences.map(
      sentence =>
        sentence
          .split(/\s+/)
          .filter(Boolean)
          .length
    );

  const avgSentenceLength =
    sentenceLengths.length > 0
      ? sentenceLengths.reduce(
          (sum, length) =>
            sum + length,
          0
        ) /
        sentenceLengths.length
      : 0;

  /*
   * Repeated phrases
   */
  const repeatedPhrases =
    findRepeatedPhrases(
      String(text || "")
    );

  /*
   * Longest / shortest
   */
  const longestSentence =
    sentences.reduce(
      (a, b) =>
        a.length > b.length
          ? a
          : b,
      ""
    );

  const shortestSentence =
    sentences.reduce(
      (a, b) =>
        a.length < b.length
          ? a
          : b,
      sentences[0] || ""
    );

  /*
   * Variance
   */
  const variance =
    sentenceLengths.length > 0
      ? sentenceLengths.reduce(
          (sum, length) =>
            sum +
            Math.pow(
              length -
                avgSentenceLength,
              2
            ),
          0
        ) /
        sentenceLengths.length
      : 0;

  const sentenceLengthStdDev =
    Math.sqrt(variance);

  return {
    wordCount:
      words.length,

    sentenceCount:
      sentences.length,

    paragraphCount:
      paragraphs.length,

    averageSentenceLength:
      Math.round(
        avgSentenceLength * 10
      ) / 10,

    vocabularyDiversity:
      Math.round(
        vocabularyDiversity *
          10000
      ) / 100,

    repeatedPhrases:
      repeatedPhrases.slice(
        0,
        10
      ),

    longestSentence:
      longestSentence.slice(
        0,
        200
      ),

    shortestSentence:
      shortestSentence.slice(
        0,
        200
      ),

    sentenceLengthStdDev:
      Math.round(
        sentenceLengthStdDev *
          10
      ) / 10,
  };
}

/* =========================================================
   REPEATED PHRASES
   ========================================================= */

function findRepeatedPhrases(
  text
) {
  const words =
    String(text || "")
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

  const phraseCounts =
    new Map();

  /*
   * Common words that are not useful
   * as standalone repeated plagiarism
   * indicators.
   */
  const stopWords =
    /\b(the|and|or|but|in|on|at|to|for|of|with|by|a|an|is|are|was|were|be|been|have|has|had|do|does|did|will|would|could|should|may|might|must|can|this|that|these|those|it|its|their|there|here|where|when|how|why|what|who|which)\b/;

  for (
    let n = 3;
    n <= 5;
    n++
  ) {
    for (
      let i = 0;
      i <= words.length - n;
      i++
    ) {
      const phrase =
        words
          .slice(i, i + n)
          .join(" ");

      if (
        !stopWords.test(
          phrase
        )
      ) {
        phraseCounts.set(
          phrase,
          (phraseCounts.get(
            phrase
          ) || 0) + 1
        );
      }
    }
  }

  return [
    ...phraseCounts.entries(),
  ]
    .filter(
      ([, count]) =>
        count > 1
    )
    .sort(
      (a, b) =>
        b[1] - a[1]
    )
    .map(
      ([phrase, count]) => ({
        phrase,
        count,
      })
    );
}

/* =========================================================
   LEGACY-COMPATIBLE HELPERS
   ========================================================= */

/**
 * Kept for compatibility with existing imports.
 *
 * IMPORTANT:
 * The old implementation attempted to poll:
 *
 * /v3/education/status/{scanId}
 *
 * That is intentionally NOT used anymore.
 *
 * Current Copyleaks API uses webhook notifications
 * for asynchronous scan completion.
 */
export async function getScanStatus(
  scanId
) {
  return {
    scanId,
    status:
      "webhook_required",
    message:
      "Current Copyleaks API uses webhook status notifications for asynchronous scans.",
  };
}

/**
 * Compatibility function.
 *
 * There is no old /v3/education/result endpoint
 * in the new implementation.
 */
export async function getScanResults(
  scanId
) {
  return {
    scanId,
    status:
      "webhook_required",
    message:
      "Use the Copyleaks completed webhook to receive scan results.",
  };
}

/**
 * Compatibility function.
 *
 * Do not perform old endpoint polling.
 */
export async function waitForScanCompletion(
  scanId
) {
  return {
    status: "processing",
    scanId,
    message:
      "Scan is processed asynchronously by Copyleaks. Use the completed webhook.",
  };
}

/* =========================================================
   OPTIONAL WEBHOOK RESULT NORMALIZER
   ========================================================= */

/**
 * Use this from your Copyleaks webhook route.
 *
 * Example:
 *
 * const result =
 *   processCopyleaksWebhook(req.body);
 *
 * Then save/forward the result to your application.
 */
export function processCopyleaksWebhook(
  payload,
  sections = [],
  wordCount = 0
) {
  if (!payload) {
    throw new Error(
      "Empty Copyleaks webhook payload"
    );
  }

  /*
   * status:
   *
   * 0 = Success
   * 1 = Error
   * 2 = CreditsChecked
   * 3 = Indexed
   */
  const status =
    Number(payload.status);

  if (status === 1) {
    throw new Error(
      "Copyleaks scan completed with an error"
    );
  }

  return parseCopyleaksResults(
    payload,
    sections,
    wordCount
  );
}

/* =========================================================
   EXPORTS
   ========================================================= */

export {
  clearTokenCache,
  createScanId,
  splitTextIntoChunks,
};