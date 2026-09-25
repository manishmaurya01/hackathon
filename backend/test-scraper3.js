import axios from 'axios';
import * as cheerio from 'cheerio';

async function testScraper() {
  const query = '"Climate change"';
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

  try {
    console.log('Fetching:', url);
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 10000,
      maxRedirects: 3,
    });

    console.log('Response length:', data.length);
    
    const $ = cheerio.load(data);
    
    // Print all classes found
    const classes = new Set();
    $('*').each((i, el) => {
      const cls = $(el).attr('class');
      if (cls) {
        cls.split(' ').forEach(c => classes.add(c));
      }
    });
    console.log('All classes found:', Array.from(classes).filter(c => c.includes('result') || c.includes('link') || c.includes('snippet') || c.includes('title')).sort());
    
    // Check for links with rel="nofollow"
    $('a[rel="nofollow"]').each((i, el) => {
      const text = $(el).text().trim();
      const href = $(el).attr('href');
      if (text && text.length > 5) {
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