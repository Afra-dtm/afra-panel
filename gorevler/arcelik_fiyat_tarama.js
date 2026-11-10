// AFRA Panel — arcelik.com.tr fiyat taraması (__DONEM__ = ay 'YYYY-MM', __YARI__ = 1 (ayın 1-15'i) ya da 2 (16'sı ve sonrası))
// arcelik.com.tr'de açık bir sekmede javascript ile çalıştırılır. Sitede hiçbir şeye tıklamaz, yalnızca okur.
// __KEY__ (app_secrets.web_prices_key), __DONEM__ ('YYYY-MM'), __YARI__ (1|2) yer tutucularını doldurun. Durum: window.__WF
(() => {
  const KEY = '__KEY__', DONEM = '__DONEM__', YARI = __YARI__;
  const SB = 'https://drgnnlewwnwshwvpoljy.supabase.co/rest/v1/rpc/ingest_web_price_snapshot';
  const APIKEY = 'sb_publishable_YpFFWDyHNFm2UF_L-Bdfyg_owoDrKbG';
  const S = window.__WF = { state: 'kategoriler', cats: 0, done: 0, pages: 0, bosSeri: 0, items: new Map(), err: [], result: null, error: null };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  // 429 (hız sınırı) ve ağ hatasında bekleyip yeniden dener; diğer hata kodlarında (4xx/5xx) vakit kaybetmeden geçer
  const get = async u => {
    for (let i = 0; i < 3; i++) {
      try {
        const r = await fetch(u, { credentials: 'omit' });
        if (r.ok) return await r.text();
        if (r.status !== 429) { if (r.status !== 404) S.err.push(u + ' ' + r.status); return null; }
      } catch (e) {}
      await wait(5000 * (i + 1));
    }
    S.err.push(u + ' tekrar'); return null;
  };
  const num = s => +String(s).replace(/\./g, '').replace(',', '.');
  const parse = html => {
    const d = new DOMParser().parseFromString(html || '', 'text/html');
    return [...d.querySelectorAll('article.prd')].map(a => {
      let g = {}; try { g = JSON.parse(a.dataset.gtmImpression || '{}'); } catch (e) {}
      const code = g.id || a.querySelector('[data-product-code]')?.dataset.productCode;
      if (!code) return null;
      const pe = a.querySelector('.prd-price');
      const nums = ((pe?.textContent || '').match(/\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?/g) || []).map(num).filter(x => x > 0);
      const href = a.querySelector('a.js-prd-url, a[href]')?.getAttribute('href') || '';
      return {
        code: String(code), brand: g.brand || '', category: g.category || '',
        title: (a.querySelector('.prd-name')?.textContent || g.name || '').replace(/\s+/g, ' ').trim(),
        list_price: nums.length ? nums[0] : null, sale_price: nums.length ? nums[nums.length - 1] : null,
        url: href ? new URL(href, location.origin).href : ''
      };
    }).filter(Boolean);
  };
  const send = async (rows, reset, final, note) => {
    const r = await fetch(SB, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: APIKEY },
      body: JSON.stringify({ p_key: KEY, p_period: DONEM, p_half: YARI, p_rows: rows, p_reset: reset, p_final: final, p_note: note || null }) });
    const j = await r.json(); if (!r.ok) throw new Error(j.message || JSON.stringify(j)); return j;
  };
  (async () => {
    try {
      // 1) Kategori site haritası
      const root = await get('/sitemap.xml');
      const catMaps = [...(root || '').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].replace(/&amp;/g, '&')).filter(u => /\/CATEGORY-/.test(u));
      let cats = [];
      for (const m of catMaps) { const x = await get(m); cats.push(...[...(x || '').matchAll(/<loc>([^<]+)<\/loc>/g)].map(z => z[1].replace(/&amp;/g, '&'))); }
      cats = [...new Set(cats.map(u => { try { return new URL(u).pathname.replace(/\/$/, ''); } catch (e) { return null; } }).filter(p => p && p.length > 1))];
      S.cats = cats.length; S.state = 'taraniyor';
      if (!cats.length) throw new Error('kategori bulunamadi (site haritasi degismis olabilir)');
      // 2) Her kategori: /ajax<yol>?sort=price-asc&page=N (6 paralel işçi)
      const queue = [...cats];
      const worker = async () => {
        while (queue.length) {
          // Art arda 150 kategori yeni ürün getirmediyse kalanlar alt/varyant sayfalarıdır: taramayı bitir
          if (S.bosSeri >= 150) { queue.length = 0; break; }
          const p = queue.shift(); let page = 1, prevSig = '', once = S.items.size;
          while (page <= 60) {
            const html = await get(`/ajax${p}?sort=price-asc&page=${page}`); S.pages++;
            const items = parse(html); if (!items.length) break;
            const sig = items.map(i => i.code).join(','); if (sig === prevSig) break; prevSig = sig; // son sayfa tekrar ediyorsa dur
            for (const it of items) if (!S.items.has(it.code)) S.items.set(it.code, it);
            page++; await wait(250);
          }
          S.done++; S.bosSeri = S.items.size > once ? 0 : S.bosSeri + 1;
        }
      };
      await Promise.all(Array.from({ length: 4 }, worker));
      const all = [...S.items.values()].filter(x => x.sale_price);
      if (all.length < 500) throw new Error(`yalnizca ${all.length} urun bulundu (500'den az) — yukleme yapilmadi`);
      // 3) Gönder (300'lük parçalar)
      S.state = 'gonderiliyor';
      for (let i = 0; i < all.length; i += 300) {
        const last = i + 300 >= all.length;
        S.result = await send(all.slice(i, i + 300), i === 0, last, last ? `${S.cats} kategoriden ${S.done} tarandi, ${S.pages} sayfa, ${all.length} urun, ${S.err.length} hatali istek` : null);
      }
      S.state = 'bitti';
    } catch (e) { S.state = 'hata'; S.error = String(e.message || e); }
  })();
  return 'basladi';
})();
