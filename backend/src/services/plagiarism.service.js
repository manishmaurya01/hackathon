/**
 * Plagiarism detection service.
 * Orchestrates the pipeline: segment text -> search sources -> fetch content -> compare -> generate evidence.
 */

import { getSearchProvider } from './search/search.provider.js';
import { cleanText, splitIntoSections, countWords } from '../utils/text.js';
import ApiError from '../utils/ApiError.js';
import { analyzeAssignment } from './openrouter.service.js';

/**
 * Split text into sentences
 */
function splitIntoSentences(text) {
  // Basic sentence splitting - handles common cases
  const sentences = text
    .replace(/\r\n/g, '\n')
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-Z])/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 20); // Filter out very short fragments

  return sentences;
}

/**
 * Select important sentences/phrases for searching
 * Avoids trivial/common sentences
 */
function selectSearchPhrases(sentences, maxPhrases = 10) {
  // Score sentences by:
  // 1. Length (longer = more distinctive)
  // 2. Presence of specific nouns/terms
  // 3. Uniqueness (avoid common phrases)

  const scored = sentences.map((sentence) => {
    const words = sentence.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    const diversity = uniqueWords.size / words.length;

    // Boost score for sentences with numbers, proper nouns, technical terms
    const hasNumbers = /\d/.test(sentence);
    const hasCapitalizedWords = /\b[A-Z][a-z]+\b/.test(sentence);
    const hasTechnicalTerms = /\b(algorithm|framework|methodology|analysis|implementation|architecture|infrastructure|optimization|computational|statistical|empirical|theoretical|methodology|hypothesis|variable|correlation|regression|classification|clustering|neural|network|model|dataset|training|inference)\b/i.test(sentence);

    let score = sentence.length * 0.1 + diversity * 50;
    if (hasNumbers) score += 10;
    if (hasCapitalizedWords) score += 5;
    if (hasTechnicalTerms) score += 20;

    // Penalize very common academic phrases
    const commonPhrases = [
      'it is important to note',
      'in conclusion',
      'furthermore',
      'moreover',
      'additionally',
      'however',
      'therefore',
      'consequently',
      'plays a crucial role',
      'in today',
      'landscape',
      'realm',
      'delve',
      'tapestry',
    ];
    const lower = sentence.toLowerCase();
    for (const phrase of commonPhrases) {
      if (lower.includes(phrase)) score -= 15;
    }

    return { sentence, score };
  });

  // Sort by score descending and take top phrases
  scored.sort((a, b) => b.score - a.score);

  // Also include some longer phrases by combining adjacent sentences
  const phrases = scored.slice(0, maxPhrases).map((s) => s.sentence);

  return phrases;
}

/**
 * Calculate text similarity between two strings
 */
function calculateSimilarity(text1, text2) {
  // 1. Jaccard similarity on words
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter((w) => w.length > 2));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter((w) => w.length > 2));

  const intersection = new Set([...words1].filter((w) => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  const jaccard = union.size > 0 ? intersection.size / union.size : 0;

  // 2. N-gram overlap (3-grams)
  function getNgrams(text, n = 3) {
    const words = text.toLowerCase().split(/\s+/);
    const ngrams = new Set();
    for (let i = 0; i <= words.length - n; i++) {
      ngrams.add(words.slice(i, i + n).join(' '));
    }
    return ngrams;
  }

  const ngrams1 = getNgrams(text1);
  const ngrams2 = getNgrams(text2);
  const ngramIntersection = new Set([...ngrams1].filter((n) => ngrams2.has(n)));
  const ngramUnion = new Set([...ngrams1, ...ngrams2]);
  const ngramOverlap = ngramUnion.size > 0 ? ngramIntersection.size / ngramUnion.size : 0;

  // 3. Longest common substring ratio
  function lcsRatio(s1, s2) {
    const m = s1.length;
    const n = s2.length;
    let maxLen = 0;
    const dp = Array(n + 1).fill(0);

    for (let i = 1; i <= m; i++) {
      for (let j = n; j >= 1; j--) {
        if (s1[i - 1] === s2[j - 1]) {
          dp[j] = dp[j - 1] + 1;
          maxLen = Math.max(maxLen, dp[j]);
        } else {
          dp[j] = 0;
        }
      }
    }
    return maxLen / Math.max(m, n);
  }

  const lcs = lcsRatio(text1, text2);

  // Weighted combination
  const combined = jaccard * 0.3 + ngramOverlap * 0.4 + lcs * 0.3;

  return {
    jaccard: Math.round(jaccard * 10000) / 100,
    ngramOverlap: Math.round(ngramOverlap * 10000) / 100,
    lcs: Math.round(lcs * 10000) / 100,
    combined: Math.round(combined * 10000) / 100,
  };
}

/**
 * Determine match type based on similarity scores
 */
function getMatchType(similarity) {
  if (similarity.lcs > 70 && similarity.jaccard > 50) return 'near-exact';
  if (similarity.ngramOverlap > 40) return 'high-similarity';
  if (similarity.combined > 30) return 'semantic';
  return 'low';
}

/**
 * Main plagiarism analysis function
 */
export async function analyzePlagiarism({ sections, wordCount }) {
  const provider = getSearchProvider();
  const fullText = sections.map((s) => s.text).join('\n\n');
  const sentences = splitIntoSentences(fullText);
  const searchPhrases = selectSearchPhrases(sentences, 12);

  const allSources = [];
  const allEvidence = [];
  const processedUrls = new Set();

  // Search for each phrase
  for (const phrase of searchPhrases) {
    try {
      const results = await provider.search(phrase, 3);

      for (const result of results) {
        if (!result.url || processedUrls.has(result.url)) continue;
        processedUrls.add(result.url);

        // Fetch full content if available
        let sourceContent = result.content || result.snippet || '';
        if (!sourceContent || sourceContent.length < 50) {
          try {
            sourceContent = await provider.fetchContent(result.url);
          } catch {
            // Ignore fetch errors, use snippet
          }
        }

        if (!sourceContent || sourceContent.length < 50) continue;

        // Compare with student text
        const similarity = calculateSimilarity(phrase, sourceContent);

        if (similarity.combined >= 25) {
          // Find which section this phrase belongs to
          let matchedSection = 1;
          for (const section of sections) {
            if (section.text.toLowerCase().includes(phrase.toLowerCase().slice(0, 50))) {
              matchedSection = section.index;
              break;
            }
          }

          const evidence = {
            section: matchedSection,
            studentText: phrase.slice(0, 300),
            sourceText: sourceContent.slice(0, 300),
            sourceTitle: result.title,
            sourceUrl: result.url,
            sourceDomain: new URL(result.url).hostname,
            similarity: similarity.combined,
            matchType: getMatchType(similarity),
            explanation: generateExplanation(similarity, phrase, sourceContent),
          };

          allEvidence.push(evidence);

          // Track unique sources
          if (!allSources.some((s) => s.url === result.url)) {
            allSources.push({
              title: result.title,
              url: result.url,
              domain: new URL(result.url).hostname,
              matchCount: 0,
              maxSimilarity: 0,
            });
          }

          // Update source stats
          const source = allSources.find((s) => s.url === result.url);
          if (source) {
            source.matchCount++;
            source.maxSimilarity = Math.max(source.maxSimilarity, similarity.combined);
          }
        }
      }
    } catch (err) {
      console.warn(`Search failed for phrase: ${phrase.slice(0, 50)}...`, err.message);
      // Continue with other phrases
    }
  }

  // Calculate overall plagiarism score
  const plagiarismScore = calculatePlagiarismScore(allEvidence, wordCount);

  // Sort evidence by similarity descending
  allEvidence.sort((a, b) => b.similarity - a.similarity);
  allSources.sort((a, b) => b.maxSimilarity - a.maxSimilarity);

  return {
    score: plagiarismScore,
    sourcesFound: allSources.length,
    matchedSections: new Set(allEvidence.map((e) => e.section)).size,
    highestMatch: allEvidence.length > 0 ? Math.max(...allEvidence.map((e) => e.similarity)) : 0,
    sources: allSources,
    evidence: allEvidence,
  };
}

/**
 * Calculate overall plagiarism score
 */
function calculatePlagiarismScore(evidence, wordCount) {
  if (!evidence.length) return 0;

  // Weight by similarity and coverage
  let weightedSum = 0;
  let totalWeight = 0;

  for (const e of evidence) {
    const weight = e.similarity / 100;
    weightedSum += e.similarity * weight;
    totalWeight += weight;
  }

  const avgSimilarity = totalWeight > 0 ? weightedSum / totalWeight : 0;

  // Adjust for document length (longer docs have more chance of incidental matches)
  const lengthFactor = Math.min(1, 1000 / Math.max(wordCount, 100));

  return Math.round(Math.min(100, avgSimilarity * lengthFactor * 1.5));
}

/**
 * Generate human-readable explanation for a match
 */
function generateExplanation(similarity, studentText, sourceText) {
  const type = getMatchType(similarity);

  if (type === 'near-exact') {
    return `The text closely matches the source with ${similarity.lcs.toFixed(0)}% character-level similarity. This suggests direct copying or minimal paraphrasing.`;
  }
  if (type === 'high-similarity') {
    return `Significant word and phrase overlap (${similarity.ngramOverlap.toFixed(0)}% n-gram overlap) with the source. The structure and key terms are very similar.`;
  }
  if (type === 'semantic') {
    return `The passage shares conceptual similarity and vocabulary with the source (${similarity.combined.toFixed(0)}% combined score), suggesting possible paraphrasing.`;
  }
  return `Some similarity detected but may be coincidental or due to common terminology.`;
}

/**
 * Generate similarity category label
 */
export function getSimilarityCategory(score) {
  if (score <= 15) return 'Low';
  if (score <= 30) return 'Moderate';
  if (score <= 50) return 'High';
  return 'Very High';
}

/**
 * Lightweight text statistics for style analysis
 */
export function calculateTextStatistics(text) {
  const cleaned = cleanText(text);
  const words = cleaned.split(/\s+/).filter(Boolean);
  const sentences = splitIntoSentences(cleaned);
  const paragraphs = cleaned.split(/\n\s*\n/).filter(Boolean);

  // Vocabulary diversity (type-token ratio)
  const uniqueWords = new Set(words.map((w) => w.toLowerCase()));
  const vocabularyDiversity = words.length > 0 ? uniqueWords.size / words.length : 0;

  // Sentence lengths
  const sentenceLengths = sentences.map((s) => s.split(/\s+/).length);
  const avgSentenceLength = sentenceLengths.length > 0
    ? sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length
    : 0;

  // Repeated phrases (3+ word sequences appearing multiple times)
  const repeatedPhrases = findRepeatedPhrases(cleaned);

  // Longest/shortest sentence
  const longestSentence = sentences.reduce((a, b) => (a.length > b.length ? a : b), '');
  const shortestSentence = sentences.reduce((a, b) => (a.length < b.length ? a : b), '');

  // Sentence length variance (consistency measure)
  const variance = sentenceLengths.length > 0
    ? sentenceLengths.reduce((sum, len) => sum + Math.pow(len - avgSentenceLength, 2), 0) / sentenceLengths.length
    : 0;
  const sentenceLengthStdDev = Math.sqrt(variance);

  return {
    wordCount: words.length,
    sentenceCount: sentences.length,
    paragraphCount: paragraphs.length,
    averageSentenceLength: Math.round(avgSentenceLength * 10) / 10,
    vocabularyDiversity: Math.round(vocabularyDiversity * 10000) / 100,
    repeatedPhrases: repeatedPhrases.slice(0, 10),
    longestSentence: longestSentence.slice(0, 200),
    shortestSentence: shortestSentence.slice(0, 200),
    sentenceLengthStdDev: Math.round(sentenceLengthStdDev * 10) / 10,
  };
}

/**
 * Find repeated 3+ word phrases
 */
function findRepeatedPhrases(text) {
  const words = text.toLowerCase().split(/\s+/);
  const phraseCounts = new Map();

  // Look for 3, 4, 5 word phrases
  for (let n = 3; n <= 5; n++) {
    for (let i = 0; i <= words.length - n; i++) {
      const phrase = words.slice(i, i + n).join(' ');
      // Skip phrases with only stop words
      if (!/\b(the|and|or|but|in|on|at|to|for|of|with|by|a|an|is|are|was|were|be|been|have|has|had|do|does|did|will|would|could|should|may|might|must|can|this|that|these|those|it|its|their|there|here|where|when|how|why|what|who|which)\b/.test(phrase)) {
        phraseCounts.set(phrase, (phraseCounts.get(phrase) || 0) + 1);
      }
    }
  }

  return [...phraseCounts.entries()]
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .map(([phrase, count]) => ({ phrase, count }));
}