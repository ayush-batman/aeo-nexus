import { lookup } from 'node:dns/promises';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { BlockList, isIP } from 'node:net';
import type { IncomingHttpHeaders, RequestOptions } from 'node:http';

const blockedAddresses = new BlockList();
for (const [network, prefix] of [
    ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
    ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
    ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24],
    ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
] as const) {
    blockedAddresses.addSubnet(network, prefix, 'ipv4');
}
for (const [network, prefix] of [
    ['::', 128], ['::1', 128], ['64:ff9b:1::', 48],
    ['100::', 64], ['2001:10::', 28], ['2001:db8::', 32], ['fc00::', 7],
    ['fe80::', 10], ['ff00::', 8],
] as const) {
    blockedAddresses.addSubnet(network, prefix, 'ipv6');
}

const BLOCKED_HOSTS = new Set([
    'localhost',
    'metadata.google.internal',
    'metadata.google.com',
]);

export class SafeFetchError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'SafeFetchError';
    }
}

export type SafeTextResponse = {
    url: string;
    status: number;
    ok: boolean;
    text: string;
    headers: IncomingHttpHeaders;
};

type SafeFetchOptions = {
    headers?: Record<string, string>;
    timeoutMs?: number;
    maxBytes?: number;
    maxRedirects?: number;
};

export function isPublicIpAddress(address: string): boolean {
    if (address.toLowerCase().startsWith('::ffff:')) return false;
    const family = isIP(address);
    if (family === 4) return !blockedAddresses.check(address, 'ipv4');
    if (family === 6) return !blockedAddresses.check(address, 'ipv6');
    return false;
}

function parseTarget(input: string, base?: URL): URL {
    let target: URL;
    try {
        target = base ? new URL(input, base) : new URL(input);
    } catch {
        throw new SafeFetchError('Invalid URL.');
    }
    if (target.protocol !== 'http:' && target.protocol !== 'https:') {
        throw new SafeFetchError('Only HTTP and HTTPS URLs are allowed.');
    }
    if (target.username || target.password) {
        throw new SafeFetchError('URLs with credentials are not allowed.');
    }
    if (target.port && target.port !== '80' && target.port !== '443') {
        throw new SafeFetchError('Only standard HTTP and HTTPS ports are allowed.');
    }
    const hostname = target.hostname.replace(/^\[|\]$/g, '').toLowerCase();
    if (
        BLOCKED_HOSTS.has(hostname)
        || hostname.endsWith('.localhost')
        || hostname.endsWith('.local')
        || hostname.endsWith('.internal')
        || hostname.endsWith('.home.arpa')
    ) {
        throw new SafeFetchError('Local hostnames are not allowed.');
    }
    return target;
}

async function resolvePublicAddress(target: URL): Promise<{ address: string; family: 4 | 6 }> {
    const hostname = target.hostname.replace(/^\[|\]$/g, '');
    const literalFamily = isIP(hostname);
    if (literalFamily) {
        if (!isPublicIpAddress(hostname)) throw new SafeFetchError('Private or reserved network targets are not allowed.');
        return { address: hostname, family: literalFamily as 4 | 6 };
    }

    let addresses: Array<{ address: string; family: number }>;
    try {
        addresses = await lookup(hostname, { all: true, verbatim: true });
    } catch {
        throw new SafeFetchError('Target hostname could not be resolved.');
    }
    if (addresses.length === 0 || addresses.some((entry) => !isPublicIpAddress(entry.address))) {
        throw new SafeFetchError('Target DNS includes a private or reserved address.');
    }
    return addresses[0] as { address: string; family: 4 | 6 };
}

function getOnce(
    target: URL,
    address: string,
    family: 4 | 6,
    options: Required<Pick<SafeFetchOptions, 'timeoutMs' | 'maxBytes'>> & Pick<SafeFetchOptions, 'headers'>,
): Promise<{ status: number; headers: IncomingHttpHeaders; text: string }> {
    return new Promise((resolve, reject) => {
        const transport = target.protocol === 'https:' ? httpsRequest : httpRequest;
        const requestOptions: RequestOptions & { servername?: string } = {
            protocol: target.protocol,
            hostname: address,
            family,
            port: target.port || (target.protocol === 'https:' ? 443 : 80),
            path: `${target.pathname}${target.search}`,
            method: 'GET',
            servername: isIP(target.hostname.replace(/^\[|\]$/g, '')) ? undefined : target.hostname,
            maxHeaderSize: 16 * 1024,
            headers: {
                Accept: 'text/html,text/plain,application/xhtml+xml;q=0.9,*/*;q=0.1',
                'Accept-Encoding': 'identity',
                Host: target.host,
                ...options.headers,
            },
        };
        const request = transport(requestOptions, (response) => {
            const status = response.statusCode ?? 0;
            const declaredLength = Number(response.headers['content-length'] ?? 0);
            if (Number.isFinite(declaredLength) && declaredLength > options.maxBytes) {
                response.destroy();
                reject(new SafeFetchError('Response is larger than the allowed limit.'));
                return;
            }
            const encoding = response.headers['content-encoding'];
            if (encoding && encoding !== 'identity') {
                response.destroy();
                reject(new SafeFetchError('Compressed responses are not accepted.'));
                return;
            }
            const chunks: Buffer[] = [];
            let received = 0;
            response.on('data', (chunk: Buffer) => {
                received += chunk.length;
                if (received > options.maxBytes) {
                    response.destroy(new SafeFetchError('Response is larger than the allowed limit.'));
                    return;
                }
                chunks.push(chunk);
            });
            response.on('end', () => resolve({
                status,
                headers: response.headers,
                text: Buffer.concat(chunks).toString('utf8'),
            }));
            response.on('error', reject);
        });
        request.setTimeout(options.timeoutMs, () => request.destroy(new SafeFetchError('Request timed out.')));
        request.on('error', reject);
        request.end();
    });
}

export async function safeFetchText(input: string, options: SafeFetchOptions = {}): Promise<SafeTextResponse> {
    const timeoutMs = Math.min(15_000, Math.max(500, options.timeoutMs ?? 8_000));
    const maxBytes = Math.min(2_000_000, Math.max(1_024, options.maxBytes ?? 512_000));
    const maxRedirects = Math.min(5, Math.max(0, options.maxRedirects ?? 3));
    let target = parseTarget(input);

    for (let redirect = 0; redirect <= maxRedirects; redirect++) {
        const { address, family } = await resolvePublicAddress(target);
        const response = await getOnce(target, address, family, { headers: options.headers, timeoutMs, maxBytes });
        const location = response.headers.location;
        if ([301, 302, 303, 307, 308].includes(response.status) && location) {
            if (redirect === maxRedirects) throw new SafeFetchError('Too many redirects.');
            target = parseTarget(Array.isArray(location) ? location[0] : location, target);
            continue;
        }
        return {
            url: target.toString(),
            status: response.status,
            ok: response.status >= 200 && response.status < 300,
            text: response.text,
            headers: response.headers,
        };
    }
    throw new SafeFetchError('Too many redirects.');
}
