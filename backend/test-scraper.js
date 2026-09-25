import axios from 'axios';
import * as cheerio from 'cheerio';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
];

async function testScraper() {
  const query = '"Climate change refers to long-term shifts in temperatures"';
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

  try {
    console.log('Fetching:', url);
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 8000,
      maxRedirects: 3,
    });

    console.log('Response length:', data.length);
    console.log('First 2000 chars:', data.slice(0, 2000));

    const $ = cheerio.load(data);
    
    // Check what elements exist
    console.log('result__body count:', $('.result__body').length);
    console.log('result__title count:', $('.result__title').length);
    console.log('result__snippet count:', $('.result__snippet').length);
    console.log('result__url count:', $('.result__url').length);
    
    // Try alternative selectors
    console.log('.result count:', $('.result').length);
    console.log('.links_main count:', $('.links_main').length);
    console.log('#links count:', $('#links').length);
    
    // Try to find any links
    $('a').each((i, el) => {
      if (i < 10) {
        console.log('Link', i, ':', $(el).text().trim(), $(el).attr('href'));
      }
    });

  } catch (err) {
    console.error('Error:', err.message);
    if (err.response) {
      console.log('Status:', err.response.status);
      console.log('Data:', err.response.data?.slice(0, 500));
    }
  }
}

testScraper();