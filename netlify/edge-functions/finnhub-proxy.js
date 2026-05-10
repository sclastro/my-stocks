// ═══════════════════════════════════════════════════════
// finnhub-proxy.js  —  Netlify Edge Function
//
// 作用：做「中間人」，將瀏覽器的請求轉發去 Finnhub，
//       並自動加上藏在 Netlify 環境變數的 API Key。
//       瀏覽器永遠見唔到 API Key。
//
// 使用方式：
//   瀏覽器請求  GET /api/finnhub?path=/quote%3Fsymbol%3DAAPL
//   Proxy 轉發  GET https://finnhub.io/api/v1/quote?symbol=AAPL&token=YOUR_KEY
// ═══════════════════════════════════════════════════════

export default async function handler(request, context) {

  // ── 只接受 GET 請求 ──
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  // ── 讀取瀏覽器傳來的 path 參數 ──
  // 例如：/api/finnhub?path=/quote?symbol=AAPL
  const url    = new URL(request.url);
  const path   = url.searchParams.get('path');

  if (!path) {
    return new Response('Missing "path" parameter', { status: 400 });
  }

  // ── 從 Netlify 環境變數讀取 API Key（永遠唔會傳去瀏覽器）──
  const apiKey = Deno.env.get('FINNHUB_API_KEY');

  if (!apiKey) {
    return new Response('API key not configured', { status: 500 });
  }

  // ── 組合 Finnhub 完整 URL ──
  // path 已包含 ? 號，例如 /quote?symbol=AAPL
  // 所以直接在尾部加 &token=...
  const finnhubUrl = `https://finnhub.io/api/v1${path}&token=${apiKey}`;

  try {
    // ── 向 Finnhub 發出請求 ──
    const response = await fetch(finnhubUrl, {
      headers: { 'Content-Type': 'application/json' }
    });

    // ── 將 Finnhub 回傳的資料原封不動傳回瀏覽器 ──
    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        // 允許你自己的網域呼叫這個 API
        'Access-Control-Allow-Origin': '*',
      }
    });

  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Proxy fetch failed', detail: err.message }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// 告訴 Netlify 呢個 Edge Function 負責處理 /api/finnhub 路徑
export const config = { path: '/api/finnhub' };
