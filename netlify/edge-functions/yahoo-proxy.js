// ═══════════════════════════════════════════════════════
// yahoo-proxy.js  —  Netlify Edge Function
//
// 作用：將瀏覽器對 Yahoo Finance 的歷史股價請求
//       透過伺服器中轉，解決瀏覽器跨域（CORS）限制。
//       Yahoo Finance 歷史數據完全免費，唔需要 API Key。
//
// 使用方式：
//   GET /api/yahoo?ticker=AAPL&range=1mo&interval=1d
// ═══════════════════════════════════════════════════════

export default async function handler(request, context) {

  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  const url      = new URL(request.url);
  const ticker   = url.searchParams.get('ticker');
  const range    = url.searchParams.get('range')    || '1mo';
  const interval = url.searchParams.get('interval') || '1d';

  if (!ticker) {
    return new Response('Missing "ticker" parameter', { status: 400 });
  }

  // Yahoo Finance v8 chart API（免費，唔需要 key）
  const yahooUrl =
    `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}` +
    `?range=${range}&interval=${interval}&includePrePost=false`;

  try {
    const response = await fetch(yahooUrl, {
      headers: {
        // 模擬瀏覽器請求，避免被 Yahoo 拒絕
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `Yahoo returned ${response.status}` }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        // Cache 15 分鐘，減少重複請求
        'Cache-Control': 'public, max-age=900',
      }
    });

  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Proxy fetch failed', detail: err.message }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export const config = { path: '/api/yahoo' };
