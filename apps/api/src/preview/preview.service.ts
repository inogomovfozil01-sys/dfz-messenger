import dns from 'dns';
import { promisify } from 'util';
import http from 'http';
import https from 'https';
import { URL } from 'url';
import { LinkPreviewData } from '@dfz/types';

const dnsLookup = promisify(dns.lookup);

export function isPrivateIp(ip: string): boolean {
  // IPv4 private & reserved ranges
  const parts = ip.split('.').map(Number);
  if (parts.length === 4) {
    if (parts[0] === 127) return true; // loopback
    if (parts[0] === 10) return true; // 10.0.0.0/8
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true; // 172.16.0.0/12
    if (parts[0] === 192 && parts[1] === 168) return true; // 192.168.0.0/16
    if (parts[0] === 169 && parts[1] === 254) return true; // link-local / AWS metadata
    if (parts[0] === 0) return true; // 0.0.0.0/8
    if (parts[0] >= 224 || parts[0] === 192 && parts[1] === 0 || parts[0] === 198 && (parts[1] === 18 || parts[1] === 19) || parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;
  }

  // IPv6 loopback / unique local / link-local
  // Only global unicast IPv6 is eligible; mapped IPv4 and local/reserved ranges are denied.
  if (ip.includes(':')) return !/^[23][0-9a-f]{3}:/i.test(ip) || ip.toLowerCase().startsWith('2001:db8:');

  return false;
}

export class PreviewService {
  /**
   * Safe fetch metadata with SSRF defenses
   */
  async getLinkPreview(rawUrl: string): Promise<LinkPreviewData> {
    const parsed = new URL(rawUrl);

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Unsupported protocol');
    }

    const hostname = parsed.hostname;
    if (parsed.username || parsed.password || parsed.port && !['80', '443'].includes(parsed.port)) throw new Error('Unsafe URL');
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      throw new Error('SSRF blocked: local address');
    }

    // Resolve DNS
    const lookup = await dnsLookup(hostname);
    if (isPrivateIp(lookup.address)) {
      throw new Error('SSRF blocked: private IP address range');
    }

    // Fetch HTML with max 500KB and 4s timeout
    const html = await new Promise<string>((resolve, reject) => {
      const client = parsed.protocol === 'https:' ? https : http;
      const req = client.get(
        parsed.href,
        {
          timeout: 4000,
          // Pin the validated address to prevent DNS rebinding between validation and connect.
          lookup: (_host: string, options: any, callback: any) => options?.all ? callback(null, [lookup]) : callback(null, lookup.address, lookup.family),
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; DFZLinkBot/1.0)',
            Accept: 'text/html,application/xhtml+xml',
          },
        },
        (res) => {
          if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
            res.resume();
            return reject(new Error(`HTTP ${res.statusCode}`));
          }

          let data = '';
          res.setEncoding('utf8');

          res.on('data', (chunk) => {
            data += chunk;
            if (data.length > 512 * 1024) {
              // 512KB cap
              req.destroy();
              resolve(data);
            }
          });

          res.on('end', () => resolve(data));
        }
      );

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Link preview request timed out'));
      });

      req.on('error', (err) => reject(err));
    });

    // Parse OpenGraph and title tags
    const titleMatch =
      html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i) ||
      html.match(/<meta\s+name=["']twitter:title["']\s+content=["'](.*?)["']/i) ||
      html.match(/<title>(.*?)<\/title>/i);

    const descMatch =
      html.match(/<meta\s+property=["']og:description["']\s+content=["'](.*?)["']/i) ||
      html.match(/<meta\s+name=["']twitter:description["']\s+content=["'](.*?)["']/i) ||
      html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i);

    const imageMatch =
      html.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/i) ||
      html.match(/<meta\s+name=["']twitter:image["']\s+content=["'](.*?)["']/i);

    const siteMatch = html.match(/<meta\s+property=["']og:site_name["']\s+content=["'](.*?)["']/i);

    return {
      url: parsed.href,
      title: titleMatch ? titleMatch[1].trim() : parsed.hostname,
      description: descMatch ? descMatch[1].trim() : undefined,
      image: imageMatch ? imageMatch[1].trim() : undefined,
      siteName: siteMatch ? siteMatch[1].trim() : parsed.hostname,
      favicon: `${parsed.origin}/favicon.ico`,
    };
  }
}

export const previewService = new PreviewService();
