/**
 * Plagiarism Detection Service
 *
 * Main application-level plagiarism service.
 *
 * This file acts as a wrapper around the Copyleaks service.
 *
 * IMPORTANT:
 * - Copyleaks credentials stay inside backend.
 * - Do not call Copyleaks directly from frontend.
 * - Do not convert API failures into 0% plagiarism.
 * - Keep the response structure compatible with the existing app.
 */

import {
  analyzePlagiarismWithCopyleaks,
  calculateTextStatistics,
  getSimilarityCategory,
} from "./copyleaks.service.js";

/* =========================================================
   MAIN PLAGIARISM ANALYSIS
   ========================================================= */

/**
 * Analyze plagiarism for the supplied sections.
 *
 * @param {Object} params
 * @param {Array} params.sections
 * @param {number} params.wordCount
 *
 * @returns {Promise<Object>}
 */
export async function analyzePlagiarism({
  sections,
  wordCount,
}) {
  /* -------------------------------------------------------
     Validate input
     ------------------------------------------------------- */

  if (!Array.isArray(sections)) {
    throw new Error(
      "Invalid plagiarism input: sections must be an array"
    );
  }

  if (sections.length === 0) {
    throw new Error(
      "Invalid plagiarism input: no sections provided"
    );
  }

  /*
   * Make sure sections contain usable text.
   */
  const validSections = sections.filter(
    (section) => {
      if (typeof section === "string") {
        return section.trim().length > 0;
      }

      return (
        section &&
        typeof section.text === "string" &&
        section.text.trim().length > 0
      );
    }
  );

  if (validSections.length === 0) {
    throw new Error(
      "Invalid plagiarism input: no text found in sections"
    );
  }

  /* -------------------------------------------------------
     Calculate word count if not supplied
     ------------------------------------------------------- */

  let finalWordCount = Number(wordCount);

  if (
    !Number.isFinite(finalWordCount) ||
    finalWordCount <= 0
  ) {
    const fullText = validSections
      .map((section) => {
        if (typeof section === "string") {
          return section;
        }

        return section.text;
      })
      .join("\n\n");

    finalWordCount =
      calculateTextStatistics(
        fullText
      ).wordCount;
  }

  /* -------------------------------------------------------
     Call Copyleaks
     ------------------------------------------------------- */

  try {
    console.log(
      `[Plagiarism] Starting analysis for ${finalWordCount} words`
    );

    const result =
      await analyzePlagiarismWithCopyleaks({
        sections: validSections,
        wordCount: finalWordCount,
      });

    if (!result) {
      throw new Error(
        "Copyleaks returned an empty result"
      );
    }

    /* -----------------------------------------------------
       Handle asynchronous/pending result
       ----------------------------------------------------- */

    if (
      result.status === "processing" ||
      result.status === "pending"
    ) {
      return {
        score: 0,

        plagiarismCategory:
          "Pending",

        sourcesFound:
          Number(result.sourcesFound) || 0,

        matchedSections:
          Number(result.matchedSections) || 0,

        highestMatch:
          Number(result.highestMatch) || 0,

        sources:
          Array.isArray(result.sources)
            ? result.sources
            : [],

        evidence:
          Array.isArray(result.evidence)
            ? result.evidence
            : [],

        status: "processing",

        scanIds:
          Array.isArray(result.scanIds)
            ? result.scanIds
            : [],

        message:
          result.message ||
          "Plagiarism scan is still being processed.",
      };
    }

    /* -----------------------------------------------------
       Normalize successful result
       ----------------------------------------------------- */

    const score = normalizeScore(
      result.score
    );

    const category =
      result.category ||
      getSimilarityCategory(score);

    const sources =
      Array.isArray(result.sources)
        ? result.sources
        : [];

    const evidence =
      Array.isArray(result.evidence)
        ? result.evidence
        : [];

    const sourcesFound =
      Number.isFinite(
        Number(result.sourcesFound)
      )
        ? Number(result.sourcesFound)
        : sources.length;

    const matchedSections =
      Number.isFinite(
        Number(result.matchedSections)
      )
        ? Number(result.matchedSections)
        : new Set(
            evidence
              .map(
                (item) =>
                  item.section
              )
              .filter(Boolean)
          ).size;

    const highestMatch =
      Number.isFinite(
        Number(result.highestMatch)
      )
        ? normalizeScore(
            result.highestMatch
          )
        : calculateHighestMatch(
            evidence
          );

    const finalResult = {
      score,

      plagiarismCategory:
        category,

      sourcesFound,

      matchedSections,

      highestMatch,

      sources,

      evidence,

      status:
        result.status ||
        "completed",

      scanIds:
        Array.isArray(result.scanIds)
          ? result.scanIds
          : [],
    };

    console.log(
      `[Plagiarism] Analysis completed: ${score}%`
    );

    return finalResult;
  } catch (error) {
    /*
     * IMPORTANT:
     *
     * DO NOT return:
     *
     * score: 0
     * category: Low
     *
     * because that would incorrectly tell the
     * frontend that the document has zero plagiarism.
     *
     * A failed API call is NOT a plagiarism score.
     */

    console.error(
      "[Plagiarism] Analysis failed:",
      error?.message ||
        "Unknown error"
    );

    throw new Error(
      `Plagiarism analysis failed: ${
        error?.message ||
        "Unknown error"
      }`
    );
  }
}

/* =========================================================
   SCORE NORMALIZATION
   ========================================================= */

/**
 * Keep plagiarism score between 0 and 100.
 */
function normalizeScore(score) {
  const numericScore =
    Number(score);

  if (
    !Number.isFinite(
      numericScore
    )
  ) {
    return 0;
  }

  return Math.round(
    Math.max(
      0,
      Math.min(
        100,
        numericScore
      )
    ) * 100
  ) / 100;
}

/* =========================================================
   HIGHEST MATCH
   ========================================================= */

/**
 * Calculate highest similarity from evidence.
 */
function calculateHighestMatch(
  evidence
) {
  if (
    !Array.isArray(evidence) ||
    evidence.length === 0
  ) {
    return 0;
  }

  let highest = 0;

  for (
    const item of evidence
  ) {
    const similarity =
      Number(
        item?.similarity
      );

    if (
      Number.isFinite(
        similarity
      )
    ) {
      highest =
        Math.max(
          highest,
          similarity
        );
    }
  }

  return normalizeScore(
    highest
  );
}

/* =========================================================
   TEXT STATISTICS
   ========================================================= */

/**
 * Calculate text statistics.
 *
 * Re-exported from the Copyleaks service
 * for compatibility with existing code.
 */
export {
  calculateTextStatistics,
};

/* =========================================================
   SIMILARITY CATEGORY
   ========================================================= */

/**
 * Re-exported from Copyleaks service.
 */
export {
  getSimilarityCategory,
};