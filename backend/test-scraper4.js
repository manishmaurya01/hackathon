import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';

async function testScraper() {
  const query = '"Climate change"';
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

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
    fs.writeFileSync('ddg-response.html', data);
    console.log('Saved to ddg-response.html');
    
    const $ = cheerio.load(data);
    
    // Check for anomaly modal
    $('.anomaly-modal').each((i, el) => {
      console.log('Anomaly modal found:', $(el).text());
    });
    
    // Check all text content
    const bodyText = $('body').text();
    console.log('Body text preview:', bodyText.slice(0, 500));
    
    // Check for any forms
    $('form').each((i, el) => {
      console.log('Form found:', $(el).attr('action'), $(el).attr('method'));
      $(el).find('input').each((j, input) => {
        console.log('  Input:', $(input).attr('name'), $(input).attr('type'), $(input).attr('value'));
      });
    });

  } catch (err) {
    console.error('Error:', err.message);
    if (err.response) {
      console.log('Status:', err.response.status);
    }
  }
}

testScraper();