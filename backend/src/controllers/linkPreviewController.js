import axios from 'axios';
import * as cheerio from 'cheerio';

export async function getLinkPreview(req, res, next) {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), 2000); // 2 second timeout

    try {
      const response = await axios.get(url, {
        signal: abortController.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      clearTimeout(timeout);

      const html = response.data;
      const $ = cheerio.load(html);

      const getMetaTag = (name) => {
        return $(`meta[name="${name}"]`).attr('content') ||
          $(`meta[property="og:${name}"]`).attr('content') ||
          $(`meta[property="twitter:${name}"]`).attr('content');
      };

      const preview = {
        title: getMetaTag('title') || $('title').text() || url,
        description: getMetaTag('description') || null,
        image: getMetaTag('image') || null,
        url: url,
        domain: new URL(url).hostname
      };

      res.json(preview);
    } catch (err) {
      clearTimeout(timeout);
      // Fallback
      res.json({
        title: url,
        description: null,
        image: null,
        url: url,
        domain: new URL(url).hostname
      });
    }
  } catch (err) {
    next(err);
  }
}
