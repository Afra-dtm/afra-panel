# AFRA Panel

Arçelik AX sistemi (Dynamics 365) verileriyle günlük kasa, sevkiyat, satış & marj, Arçelik fiyatları ve bağımsız denetim uygulaması.

- **Arayüz:** `index.html` (tek dosya, derleme yok) + `manifest.webmanifest`, `sw.js`, `icons/` (telefona kurulabilir uygulama)
- **Veritabanı:** Supabase `arcelik-finans-takip` (drgnnlewwnwshwvpoljy, Frankfurt)
- **Yayın:** `main` dalına her kayıtta GitHub Pages otomatik yayınlar (Settings → Pages → Deploy from a branch: main / root) → https://afra-dtm.github.io/afra-panel/ . Simgeler PNG olarak depoda; netlify.toml artık kullanılmıyor.
- **Zamanlanmış görevler:** `gorevler/GOREVLER.md` (kasa 10:30, sevkiyat 11:35, kontrol ajanı 12:10, fiyat taraması ayın 1–3 / 16–18'i 14:41), fiyat tarama betiği `gorevler/arcelik_fiyat_tarama.js`
