/**
 * Search provider abstraction for plagiarism detection.
 * Supports multiple search APIs (Tavily, Serper, etc.) with a unified interface.
 */

import env from '../../config/env.js';
import ApiError from '../../utils/ApiError.js';

/**
 * Base search provider interface
 */
class SearchProvider {
  constructor() {
    if (this.constructor === SearchProvider) {
      throw new Error('SearchProvider is abstract - use a concrete implementation');
    }
  }

  /**
   * Search for sources matching the query
   * @param {string} query - Search query
   * @param {number} maxResults - Maximum results to return
   * @returns {Promise<Array<{title: string, url: string, snippet: string, content?: string}>>}
   */
  async search(query, maxResults = 5) {
    throw new Error('search() must be implemented by subclass');
  }

  /**
   * Fetch and extract text content from a URL
   * @param {string} url - URL to fetch
   * @returns {Promise<string>} - Extracted text content
   */
  async fetchContent(url) {
    throw new Error('fetchContent() must be implemented by subclass');
  }
}

/**
 * Tavily Search Provider
 * API Documentation: https://docs.tavily.com/
 */
class TavilyProvider extends SearchProvider {
  constructor() {
    super();
    this.apiKey = env.TAVILY_API_KEY;
    this.baseUrl = 'https://api.tavily.com';
  }

  async search(query, maxResults = 5) {
    if (!this.apiKey) {
      throw new ApiError(503, 'Tavily API key not configured', { code: 'SEARCH_API_KEY_MISSING' });
    }

    try {
      const response = await fetch(`${this.baseUrl}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: this.apiKey,
          query,
          search_depth: 'advanced',
          max_results: maxResults,
          include_answer: false,
          include_raw_content: true,
          include_images: false,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new ApiError(
          502,
          `Tavily search failed: ${error.error?.message || response.statusText}`,
          { code: 'SEARCH_UPSTREAM_ERROR', status: response.status }
        );
      }

      const data = await response.json();
      return (data.results || []).map((r) => ({
        title: r.title || 'Untitled',
        url: r.url,
        snippet: r.content || r.snippet || '',
        content: r.raw_content || r.content || '',
        score: r.score,
      }));
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(502, `Tavily search request failed: ${err.message}`, { code: 'SEARCH_NETWORK_ERROR' });
    }
  }

  async fetchContent(url) {
    // Tavily returns raw_content in search results, so we can use that
    // This method is kept for interface compatibility
    const results = await this.search(url, 1);
    return results[0]?.content || '';
  }
}

/**
 * Serper.dev Search Provider
 * API Documentation: https://serper.dev/
 */
class SerperProvider extends SearchProvider {
  constructor() {
    super();
    this.apiKey = env.SERPER_API_KEY;
    this.baseUrl = 'https://google.serper.dev';
  }

  async search(query, maxResults = 5) {
    if (!this.apiKey) {
      throw new ApiError(503, 'Serper API key not configured', { code: 'SEARCH_API_KEY_MISSING' });
    }

    try {
      const response = await fetch(`${this.baseUrl}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': this.apiKey,
        },
        body: JSON.stringify({
          q: query,
          num: maxResults,
          type: 'search',
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new ApiError(
          502,
          `Serper search failed: ${error.message || response.statusText}`,
          { code: 'SEARCH_UPSTREAM_ERROR', status: response.status }
        );
      }

      const data = await response.json();
      return (data.organic || []).map((r) => ({
        title: r.title || 'Untitled',
        url: r.link,
        snippet: r.snippet || '',
        content: r.snippet || '',
      }));
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(502, `Serper search request failed: ${err.message}`, { code: 'SEARCH_NETWORK_ERROR' });
    }
  }

  async fetchContent(url) {
    // Serper doesn't provide full content, would need separate fetch
    // For now, return snippet
    const results = await this.search(url, 1);
    return results[0]?.snippet || '';
  }
}

/**
 * DuckDuckGo HTML Scraper (fallback - no API key needed)
 * Note: Less reliable, used only when no API keys configured
 */
class DuckDuckGoProvider extends SearchProvider {
  constructor() {
    super();
    this.baseUrl = 'https://html.duckduckgo.com/html/';
  }

  async search(query, maxResults = 5) {
    try {
      const params = new URLSearchParams({ q: query });
      const response = await fetch(`${this.baseUrl}?${params}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; VeriWrite/1.0)',
        },
      });

      if (!response.ok) {
        throw new ApiError(502, 'DuckDuckGo search failed', { code: 'SEARCH_UPSTREAM_ERROR' });
      }

      const html = await response.text();
      return this.parseResults(html, maxResults);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(502, `DuckDuckGo search failed: ${err.message}`, { code: 'SEARCH_NETWORK_ERROR' });
    }
  }

  parseResults(html, maxResults) {
    const results = [];
    const regex = /class="result__snippet"[^>]*>([^<]*)<\/a>/g;
    const urlRegex = /class="result__url"[^>]*>([^<]*)<\/a>/g;
    const titleRegex = /class="result__title"[^>]*>([^<]*)<\/a>/g;

    let match;
    const snippets = [];
    while ((match = regex.exec(html)) !== null && snippets.length < maxResults) {
      snippets.push(match[1].trim());
    }

    const urls = [];
    while ((match = urlRegex.exec(html)) !== null && urls.length < maxResults) {
      urls.push(match[1].trim());
    }

    const titles = [];
    while ((match = titleRegex.exec(html)) !== null && titles.length < maxResults) {
      titles.push(match[1].trim());
    }

    for (let i = 0; i < Math.min(snippets.length, maxResults); i++) {
      if (snippets[i]) {
        results.push({
          title: titles[i] || 'Search Result',
          url: urls[i] || '',
          snippet: snippets[i],
          content: snippets[i],
        });
      }
    }

    return results;
  }

  async fetchContent(url) {
    // Would need to fetch and parse the actual page
    return '';
  }
}

/**
 * Factory function to get the configured search provider
 */
export function getSearchProvider() {
  const provider = (env.SEARCH_PROVIDER || 'tavily').toLowerCase();

  switch (provider) {
    case 'tavily':
      return new TavilyProvider();
    case 'serper':
      return new SerperProvider();
    case 'duckduckgo':
      return new DuckDuckGoProvider();
    default:
      throw new ApiError(500, `Unknown search provider: ${provider}`, { code: 'INVALID_SEARCH_PROVIDER' });
  }
}

export { SearchProvider, TavilyProvider, SerperProvider, DuckDuckGoProvider };