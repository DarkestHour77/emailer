import * as cheerio from 'cheerio';
import { env } from '../config/env';

// 1x1 transparent PNG (68 bytes)
export const TRACKING_PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNjN9GQAAAABJREFUeJxjYGBgAAAABAABJzQnCgAAAABJRU5ErkJggg==',
  'base64'
);

export function injectTrackingPixel(html: string, trackingId: string): string {
  const pixelUrl = `${env.trackingBaseUrl}/t/${trackingId}/pixel.png`;
  const pixelTag = `<img src="${pixelUrl}" width="1" height="1" style="display:none" alt="" />`;

  if (html.includes('</body>')) {
    return html.replace('</body>', `${pixelTag}</body>`);
  }
  return html + pixelTag;
}

export function rewriteLinks(html: string, trackingId: string): string {
  const $ = cheerio.load(html);

  $('a[href]').each((_i, el) => {
    const originalUrl = $(el).attr('href');
    if (!originalUrl || originalUrl.startsWith('mailto:') || originalUrl.startsWith('#')) {
      return;
    }
    const redirectUrl = `${env.trackingBaseUrl}/t/${trackingId}/click?url=${encodeURIComponent(originalUrl)}`;
    $(el).attr('href', redirectUrl);
  });

  return $.html();
}

export function resolveTemplate(
  html: string,
  contact: { username: string; email: string }
): string {
  return html
    .replace(/\{\{username\}\}/g, contact.username)
    .replace(/\{\{email\}\}/g, contact.email);
}
