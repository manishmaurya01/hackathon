import axios from 'axios';
import * as cheerio from 'cheerio';

async function testLiteDuckDuckGo() {
  const query = '"Climate change"';
  // Try lite.duckduckgo.com
  const url = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`;

  try {
    console.log('Fetching:', url);
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      timeout: 10000,
      maxRedirects: 3,
    });

    console.log('Response length:', data.length);
    
    const $ = cheerio.load(data);
    console.log('Body text preview:', $('body').text().slice(0, 1000));
    
    // Check table rows (lite uses tables)
    $('tr').each((i, el) => {
      const text = $(el).text().trim();
      if (text) {
        console.log('TR:', text.slice(0, 200));
      }
    });
    
    $('table').each((i, el) => {
      console.log('Table', i, ':', $(el).html()?.slice(0, 500));
    });

  } catch (err) {
    console.error('Error:', err.message);
    if (err.response) {
      console.log('Status:', err.response.status);
      console.log('Data:', err.response.data?.slice(0, 500));
    }
  }
}

testLiteDuckDuckGo();