import axios from 'axios';
import * as cheerio from 'cheerio';

async function testScraper() {
  const query = '"Climate change refers to long-term shifts in temperatures"';
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

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

    const $ = cheerio.load(data);
    
    // Find all elements with class containing "result"
    $('[class*="result"]').each((i, el) => {
      if (i < 10) {
        console.log('Result class:', $(el).attr('class'));
        console.log('  HTML:', $(el).html()?.slice(0, 200));
        console.log('---');
      }
    });
    
    // Check for table rows (DDG sometimes uses tables)
    $('tr').each((i, el) => {
      if (i < 10) {
        console.log('TR:', $(el).attr('class'));
        console.log('  HTML:', $(el).html()?.slice(0, 200));
        console.log('---');
      }
    });
    
    // Check for links with result-like classes
    $('a').each((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      if (href && text && text.length > 10) {
        console.log('Link:', text.slice(0, 100), '->', href);
      }
    });

  } catch (err) {
    console.error('Error:', err.message);
    if (err.response) {
      console.log('Status:', err.response.status);
    }
  }
}

testScraper();