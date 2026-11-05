# AFRA Panel — Zamanlanmış görev metinleri

Afra Finans devir dosyasındaki görevlerden AFRA Panel'e uyarlanmıştır (AX ekranları, sanal tablo okuma yöntemi ve kurallar aynı; veritabanı ve fonksiyonlar AFRA Panel'e ait).

Ortak: Supabase projesi `drgnnlewwnwshwvpoljy`, Claude in Chrome (AX oturumu açık olmalı), telefona bildirim açık. Bilgisayar 20:00'de kapandığı için görevler sabah çalışır.

---

## GÖREV 1 — AX Kasa Aktarımı (her gün 10:30)

Cron: `CRON_TZ=Europe/Istanbul 30 10 * * *`

```
GÖREV: Afra Dayanıklı Tüketim (Arçelik bayisi) için AX sistemindeki DÜNKÜ (kapanmış önceki gün) satış ve ödemeleri oku ve AFRA Panel'in ONAY KUYRUĞUNA (Supabase ax_kuyruk tablosu) bırak. Kasaya kendin KAYIT YAZMA; yönetici AFRA Panel → Günlük Kasa ekranında "İncele ve onayla" ile onaylayacak. AX sisteminde hiçbir şeyi değiştirme, sadece oku. Şifre girme: Microsoft giriş ekranı çıkarsa dur ve kullanıcıya "AX sistemine giriş gerekiyor, Chrome'da giriş yapıp bana yazın" diye bildir. Kullanıcıyla konuşurken "Dynamics" değil "AX sistemi" de. Tüm iletişim Türkçe.

HAZIRLIK
- Supabase (proje drgnnlewwnwshwvpoljy) execute_sql: select value from app_secrets where name='kasa_key';  (K)
- D = Türkiye saatiyle DÜNÜN tarihi. Batch B = 'D-HHMM' (D = YYYY-MM-DD, HHMM görevin çalıştığı saat).
- select batch,durum from ax_kuyruk where durum in ('bekliyor','yukleniyor') and rapor_tarihi='D'; 'bekliyor' varsa yeni aktarım YAPMA, "D için onay bekleyen aktarım zaten var, önce onu onaylayın" diye bildir ve dur. (Daha önce ONAYLANMIŞ aktarım olması sorun değil; aynı satışlar SalesLine RecId sayesinde iki kez yazılmaz.)
- chrome-browser becerisini yükle; Claude in Chrome araçlarını tek ToolSearch ile yükle; yeni sekme aç. Sekme görünür olmalı (sanal tablolar ancak görünürken yüklenir).
- Veriyi ASLA sohbete kopyalama: satırları sayfadaki JavaScript ile topla ve aynı JavaScript içinden fetch ile gönder:
  fetch("https://drgnnlewwnwshwvpoljy.supabase.co/rest/v1/rpc/stage_kasa",{method:"POST",headers:{"Content-Type":"application/json",apikey:"sb_publishable_YpFFWDyHNFm2UF_L-Bdfyg_owoDrKbG"},body:JSON.stringify({p_key:K,p_batch:B,p_part:"sales"|"pays"|"done",p_rows:[...],p_meta:{...}})})
  İlk "sales" gönderiminin ilk elemanı BAŞLIK satırı olmalı (aşağıdaki adlar, birebir), sonra veri satırları (her satır başlıkla aynı sırada dizi). 300'er satırlık parçalar. "pays" için de aynısı.

1) SATIŞ SATIRLARI — https://liverapid360.operations.dynamics.com/?cmp=1126&mi=ETGSalesInDetail
- İşlem tarihi D – D, "İptalleri Göster: Evet". Sorgula.
- Ayrıca D-7 – D aralığını "İptalleri Göster: Evet" ile sorgula; bu ikinci sorgudan SADECE Satır durumu "İptal edildi" olanları al. İki sorgunun satırlarını SalesLine RecId'ye göre tekilleştir.
- Tablo sanal kaydırmalıdır (fixedDataTable): görünür grid [role=grid] (offsetParent dolu olan); başlıklar [role=columnheader] innerText; hücreler [role=gridcell] içindeki input.value ya da innerText; satır no aria-rowindex. Arka planda async döngüyle .fixedDataTableLayout_rowsContainer üzerine WheelEvent (deltaY 300) gönder, her adımda requestAnimationFrame + ~700 ms bekle, satırları Map'e (aria-rowindex) ekle; sayfa sınırlarında (~50-60 satırda) yükleme beklenir, 25 adım boyunca yeni satır gelmezse bitir, arada 5 adımda bir deltaY:-400 gönderip 1,5 sn bekle. Durumu window değişkeninden ayrı kısa çağrılarla kontrol et (tek çağrı 45 sn'yi aşmasın). Bitince 2..aria-rowcount arasında eksik indeks olmadığını doğrula; eksik varsa devam et.
- BAŞLIK (birebir, bu sırayla): ["Satış siparişi","Madde kodu","Ürün Kısa Kodu","Miktar","Toplam tutar","Satış / İade","Sipariş Tarihi","İşlem Tarihi","Kota Grubu.Grup adı","Satır durumu","İptal tarihi","SalesLine RecId","Müşteri Adı","Satışı yapanın adı","Mağaza","Fatura Notu"]. AX'teki sütun adı farklıysa anlamca eşleşeni kullan; olmayanı "" bırak. Tarihler GG.AA.YYYY, tutarlar sayı (nokta ondalık).
- Kontrol toplamı: iptal edilmemiş, tutarı > 0, iade olmayan satırların sayısı (SR) ve toplamı (ST). Ekrandaki TOPLAMLAR (Adet, Tutar) alanlarının tam değerini input.value/innerText'ten oku ve karşılaştır; tutmuyorsa note'a yaz.

2) ÖDEMELER — https://liverapid360.operations.dynamics.com/?cmp=1126&mi=ETGCashTableReportForm
- Her mağaza için ayrı çalıştır: 21134410 (Parseller) ve 21134409 (Güneşli). Tarih D – D. Sorgula, sonra "Kasa föyü satış toplamına göre ayrıntı" raporunu aç. Rapor pdf.js içinde açılır: PDFViewerApplication.pdfDocument üzerinden her sayfa için getPage(i).getTextContent(); x koordinatlarına göre sütunları, y'ye göre satırları ayır.
- BAŞLIK: ["İşlem No","Sipariş No","İşlem Tarihi","Müşteri Adı","Mağaza No","Mağaza Adı","Ödeme","Ödeme Tipi","Ödenecek Tutar","Taksit sayısı"]. Mağaza No = 21134410 / 21134409 (şube eşlemesi buna göre yapılır, mutlaka doldur). Tutarlar sayı; iade/virman eksi işaretli.
- Rapor açılamazsa ödemeleri boş geç, note'a "ödeme raporu okunamadı" yaz (satışlar yine gönderilsin).

3) BİTİR
- p_part:"done", p_rows:[], p_meta:{run_label:"GG.AA.YYYY — SS:DD sabah otomatik", date_from:"D", date_to:"D", src_rows:SR, src_amount:ST, note:"<kısa Türkçe not: kaç satış, kaç iptal, kaç ödeme; uyarılar>"}.
- Doğrula: select batch,durum,jsonb_array_length(satislar) s,jsonb_array_length(odemeler) o from ax_kuyruk where batch='B'; durum 'bekliyor' olmalı.
- D günü satış yoksa (pazar/tatil) yine "done" gönder (note: "satış yok").
- Açtığın sekmeleri kapat. Bildirim gönder (PushNotification varsa onunla): "GG.AA.YYYY kasa aktarımı onayınızı bekliyor: X satış (Y TL), Z iptal, W ödeme — AFRA Panel → Günlük Kasa". AX sistemine ulaşılamadıysa ya da oturum kapalıysa bunu bildir.
- Bilgi: Mağaza YENİGÜN → Parseller, AFRA → Güneşli, KURUMSAL → Kurumsal; "TOPLU PROJE SATIŞI" temsilcili satışlar Kurumsal. Eşlemeyi veritabanı yapar.
```

---

## GÖREV 2 — AX Günlük Sevkiyat (her gün 11:35)

Cron: `CRON_TZ=Europe/Istanbul 35 11 * * *`

```
GÖREV: Afra Dayanıklı Tüketim (Arçelik bayisi) için BUGÜNÜN sevkiyatlarını AX sisteminden oku ve AFRA Panel'e aktar. AX sisteminde hiçbir şeyi değiştirme, sadece oku. Şifre girme. Kullanıcıyla konuşurken "AX sistemi" de. Tüm iletişim Türkçe.

1) VERİYİ ÇEK (Claude in Chrome):
- chrome-browser becerisini yükle; mcp__claude-in-chrome__ araçlarını tek ToolSearch ile yükle (tabs_context_mcp, navigate, computer, find, javascript_tool, browser_batch, tabs_close_mcp). tabs_context_mcp(createIfEmpty:true).
- https://liverapid360.operations.dynamics.com/?cmp=1126&mi=ETGTHIntegration (TH İş Emirleri).
- Microsoft giriş ekranı çıkarsa ŞİFRE GİRME; "AX sistemine giriş gerekiyor, Chrome'da giriş yapıp bana yazın" de ve dur.
- "Sorgula" sekmesi. Başlangıç tarihi = bugünden 14 gün önce, Bitiş = bugün (GG.AA.YYYY; alanı triple_click, yaz, Tab). En fazla 1 aylık aralık.
- Mavi "Ara" butonu (JS: [...document.querySelectorAll('button')].find(b=>b.innerText.trim()==='Ara'&&b.offsetParent).click()). 15 sn bekle.
- Grid sanal kaydırmalı (fixedDataTable). Görünür grid [role=grid] (offsetParent dolu). Başlıklar [role=columnheader]; değerler [role=gridcell] input.value ya da innerText; satır no aria-rowindex. Arka planda async döngü (window değişkeni; tek çağrı 45 sn'yi aşmasın): .fixedDataTableLayout_rowsContainer üzerine WheelEvent deltaY:200, her adımda 900 ms; Map'e ekle. Sayfa sınırlarında en az 25 adım sabır, 5 adımda bir deltaY:-400 + 1,5 sn. Bitince 2..aria-rowcount eksik indeks olmadığını doğrula; varsa devam et.
- Filtre: "Randevu tarihi" bugünle (YYYY-MM-DD) başlayan satırlar. İptal Edildi olanları dahil etme ama say. 1900-01-01 = randevusuz.

2) EŞLEME:
- store: "Mağaza" YENİGÜN içeriyorsa "PARSELLER", değilse "GÜNEŞLİ".
- depot_type: Depo = BODIST-AVR → "BOD"; diğerleri → "MAĞAZA".

3) AFRA PANEL'E AKTAR (Supabase, proje drgnnlewwnwshwvpoljy, execute_sql):
- Bugünün (iptaller hariç) satırlarını JSON dizisine çevir: ship_time ("SS:DD"), store, depot, depot_type, customer, order_no (Satış siparişi), work_order (İş Emri No), order_date ("YYYY-MM-DD"), item_code (Madde kodu), product (Ürün adı), amount (sayı), rep (Satış Temsilcisi), wo_status (İş emri durumu), invoice_no (yoksa "").
- select ingest_sevkiyat((select value from app_secrets where name='sevk_key'), 'YYYY-MM-DD'::date, '<JSON>'::jsonb);  Tek tırnakları ikile. Tüm günü TEK çağrıda gönder. Veri çekme eksik/başarısızsa bu adımı ATLA. Randevu yoksa '[]' gönder.

4) BİLDİR:
- Açtığın sekmeyi kapat. Bildirim (PushNotification varsa): "GG.AA.YYYY sevkiyat: X satır (Parseller A / Güneşli B; BOD C, mağaza deposu D) — AFRA Panel → Sevkiyat". Dikkat: Teknisyende olmayan iş emirleri, mağaza deposundan çıkanlar, 1 aydan eski siparişler, faturası olmayanlar (3-5 madde).
- Randevu yoksa: "GG.AA.YYYY için randevulu sevkiyat yok" ve önümüzdeki günlerin randevu sayıları (gün | satır | Parseller/Güneşli).
- Chrome'a ulaşılamıyorsa (bilgisayar kapalı/uykuda) bunu bildir: "bilgisayar açılınca bu sohbete 'bugünün sevkiyatını çek' yazabilirsiniz".
```
