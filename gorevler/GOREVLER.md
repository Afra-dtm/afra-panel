# AFRA Panel — Zamanlanmış görev metinleri

Afra Finans devir dosyasındaki görevlerden uyarlanmış ve 5 Kasım 2026'da AX sisteminde elle denenerek düzeltilmiştir.
Tarayıcı: Claude masaüstü uygulamasının kendi tarayıcısı (mcp__remote-devices__Claude_Browser__*). AX oturumu orada açık olmalı.
Supabase projesi: `drgnnlewwnwshwvpoljy`. Bilgisayar 20:00'de kapandığı için görevler sabah çalışır.

---

## GÖREV 1 — AX Kasa Aktarımı (her gün 10:30)

Cron: `CRON_TZ=Europe/Istanbul 30 10 * * *`

```
GÖREV: Afra Dayanıklı Tüketim (Arçelik bayisi) için AX sistemindeki DÜNKÜ (kapanmış önceki gün) satış ve ödemeleri oku ve AFRA Panel'in ONAY KUYRUĞUNA (Supabase ax_kuyruk) bırak. Kasaya kendin KAYIT YAZMA; yönetici AFRA Panel → Günlük Kasa → "İncele ve onayla" ile onaylar. AX sisteminde hiçbir şeyi değiştirme, sadece oku: "Onayla", "Kaydet", "Sil", "Yeni" düğmelerine ASLA basma. Şifre girme: Microsoft giriş ekranı çıkarsa dur ve kullanıcıya "AX sistemine giriş gerekiyor; Claude uygulamasının tarayıcısında giriş yapıp bana yazın" diye bildir. Kullanıcıyla konuşurken "AX sistemi" de. Tüm iletişim Türkçe.

HAZIRLIK
- Supabase (drgnnlewwnwshwvpoljy) execute_sql: select value from app_secrets where name='kasa_key';  (K)
- D = Türkiye saatiyle DÜN (YYYY-MM-DD); DG = D'nin GG.AA.YYYY hali (ör. 4.11.2026). B = 'D-HHMM' (çalışma saati).
- select batch from ax_kuyruk where durum in ('bekliyor','yukleniyor') and rapor_tarihi='D'; 'bekliyor' varsa yeni aktarım YAPMA, "D için onay bekleyen aktarım var, önce onu onaylayın" de ve dur. ('yukleniyor' kalmış eski bir batch varsa yok say, yeni B ile devam et.)
- built-in-browser becerisini yükle; Claude_Browser araçlarını tek ToolSearch ile yükle (sorgu "mcp__remote-devices__Claude_Browser__"). preview_start ile sekme aç; resize_window ile 1500x1000 yap (dar panelde alanlar kayıyor). İş bitince resize_window preset "desktop" ve sekmeyi kapat.
- Veriyi ASLA sohbete kopyalama; satırları sayfadaki JavaScript ile topla ve aynı JavaScript içinden gönder:
  fetch("https://drgnnlewwnwshwvpoljy.supabase.co/rest/v1/rpc/stage_kasa",{method:"POST",headers:{"Content-Type":"application/json",apikey:"sb_publishable_YpFFWDyHNFm2UF_L-Bdfyg_owoDrKbG"},body:JSON.stringify({p_key:K,p_batch:B,p_part:"sales"|"pays"|"done",p_rows:[...],p_meta:{...}})})
  "sales" ve "pays" için BAŞLIK satırını yalnızca İLK gönderimde koy; sonraki parçalarda başlık OLMASIN. 300'er satırlık parçalar.
- Sayfa her yeni adrese gidişte window değişkenlerini kaybeder; yardımcı fonksiyonları her sayfada yeniden tanımla.

1) SATIŞLAR — https://liverapid360.operations.dynamics.com/?cmp=1126&mi=ETGSalesInDetail (Detaylı satış raporu)
- Alanlar (id sonekleri, input elemanları): etgsalesindetail_1_StartDate_input / _EndDate_input = Sipariş başlangıç/bitiş; _startCreatedDateTime_input / _endCreatedDateTime_input = İşlem başlangıç/bitiş. Değerleri tıklayıp (triple_click) yazarak ve Tab ile gir (koordinatı getBoundingClientRect ile bul; ekran görüntüsü çerçevesine ölçekle).
  Sipariş başlangıç = D'den 35 gün önce, Sipariş bitiş = DG; İşlem başlangıç = DG; İşlem bitiş = "DG 23:59:59" (saat yazılmazsa 00:00:00 olur ve gün dışarıda kalır). Girdikten sonra JS ile değerleri doğrula.
- "İptalleri Göster" anahtarı: #etgsalesindetail_1_salesStatusCanceled_toggle; aria-checked "true" olmalı (değilse tıkla).
- "Sorgula" düğmesine bas ([...document.querySelectorAll('button')].find(b=>b.innerText.trim()==='Sorgula'&&b.offsetParent).click()), 15 sn bekle.
- Ekran toplamlarını oku (kontrol toplamı): input id'leri ...realTotalSalesQty_input (adet), ...realTotalLineAmount_input (tutar, iptaller hariç), ...realCancelTotalLineAmount_input (iptal tutarı, eksi), ...realReturnTotalLineAmount_input (iade).
- Sanal tablo (fixedDataTable): görünür [role=grid]; başlıklar [role=columnheader] innerText (ilk sütun boş = seçim kutusu, hücre dizisi başlık dizisiyle aynı uzunlukta); hücre değeri [role=gridcell] içindeki input.value ya da innerText; satır no aria-rowindex (2'den başlar). Arka plan async döngü: .fixedDataTableLayout_rowsContainer üzerine WheelEvent deltaY 300, her adım requestAnimationFrame + 700 ms, satırları Map'e ekle ("Satır yükleniyor" olanları atla); toplanan = aria-rowcount-1 olunca ya da 25 adım yeni satır gelmezse bitir. Durumu ayrı kısa çağrılarla oku (tek çağrı 45 sn'yi aşmasın). 2..aria-rowcount arasında eksik indeks kalmamalı.
- Doğrula: iptal edilmemiş satırların Miktar toplamı = ekran adedi, Toplam tutar toplamı = ekran tutarı. Tutmuyorsa toplamayı tekrarla; yine tutmazsa note'a yaz.
- BAŞLIK (birebir): ["Satış siparişi","Madde kodu","Ürün Kısa Kodu","Miktar","Toplam tutar","Satış / İade","Sipariş Tarihi","İşlem Tarihi","Kota Grubu.Grup adı","Satır durumu","İptal tarihi","SalesLine RecId","Müşteri Adı","Satışı yapanın adı","Mağaza","Fatura Notu"]. "Kota Grubu.Grup adı" için ekrandaki "Kota Grubu" sütununu kullan. Tarihleri ilk 10 karakter (G.AA.YYYY), Miktar ve Toplam tutarı nokta ondalıklı sayı metni olarak gönder.

2) ÖDEMELER — https://liverapid360.operations.dynamics.com/?cmp=1126&mi=ETGCashTableReportForm (Kasa Föyü Raporu)
- Her mağaza için ayrı: önce 21134410 (Parseller), sonra 21134409 (Güneşli). Alanlar: input id sonu _1_storeId_input (Mağaza), _1_TransDate_input, _1_toTransDate_input. Mağaza kodunu yaz, Tab; tarihleri DG yaz, Tab. Sonra "Sorgula" düğmesi (Onayla'ya DEĞİL).
- "Satış Bilgileri" bölümündeki "Kasa föyü satış toplamına göre ayrıntı" bağlantısına tıkla; "ÖDEME PLANI RAPORU" PDF'i sayfadaki iframe'de (src'si "pdfjs" içeren) açılır. PDFViewerApplication.pdfDocument hazır olana kadar bekle (iframe.contentWindow üzerinden; üst penceredeki boş PDFViewerApplication'ı kullanma).
- Her sayfa için getPage(i).getTextContent(): "Mağaza No" metninin y'si başlık satırıdır; aynı y'deki metinler sütun başlıklarıdır (x sırasıyla; sütun aralığı = başlık x-6 .. sonraki başlık x-6). Satır başlangıçları: başlığın altında, ilk sütunda 8 haneli mağaza numarası olan metinler. Bir satırın hücreleri o satırın y'si ile bir sonraki satırın y'si arasındaki metinlerdir (çok satırlı hücreleri boşlukla birleştir).
- ÖNEMLİ: Tablonun altında "Ödeme tiplerine göre ödeme toplamı" özet bölümü vardır. Bu metnin y'sinin ALTINDAKİ hiçbir metni satırlara katma (son satıra karışıyor).
- BAŞLIK: ["İşlem No","Sipariş No","İşlem Tarihi","Müşteri Adı","Mağaza No","Mağaza Adı","Ödeme","Ödeme Tipi","Ödenecek Tutar","Taksit sayısı"] (PDF'teki "Taksit" sütunu = Taksit sayısı). Ödenecek Tutar "TL14.300,00" biçimindedir → 14300 (eksi işareti korunur). Mağaza No tam 8 hane olmalı, İşlem No "^\d{8}-\d+-\s?\d+$" biçiminde olmalı; değilse satırı düzelt.
- Kontrol: Kasa Föyü ekranındaki "Satış Bilgileri" tablosunun ödeme yöntemi toplamları (Nakit, Banka kartı, VAD…) ile okunan satırları karşılaştır; farkı note'a yaz.
- Mağaza değiştirmek için sayfaya adresle yeniden git (navigate ile aynı URL). İkinci mağazanın satırlarını BAŞLIKSIZ gönder.
- Rapor açılamazsa o mağazanın ödemelerini boş geç, note'a yaz.

3) BİTİR
- p_part "done", p_rows [], p_meta {run_label:"DG — SS:DD sabah otomatik", date_from:"D", date_to:"D", src_rows:<ekran adedi>, src_amount:<ekran tutarı>, note:"<kısa Türkçe not: kaç satış/kaç TL, kaç iptal, kaç ödeme satırı (mağaza bazında), uyarılar>"}.
- Doğrula: select durum, jsonb_array_length(satislar) s, jsonb_array_length(odemeler) o from ax_kuyruk where batch='B'; durum 'bekliyor' olmalı.
- D günü satış yoksa (pazar/tatil) yine "done" gönder (note "satış yok").
- resize_window preset "desktop", sekmeyi kapat. Bildirim (PushNotification varsa): "DG kasa aktarımı onayınızı bekliyor: X satış (Y TL), Z iptal, W ödeme — AFRA Panel → Günlük Kasa". AX'e ulaşılamadıysa / oturum kapalıysa ya da Claude uygulaması kapalıysa bunu bildir.
- Bilgi: şube eşlemesini veritabanı yapar (YENİGÜN → Parseller, AFRA → Güneşli, KURUMSAL ya da "TOPLU PROJE SATIŞI" → Kurumsal). VAD (vadeli açık hesap) ödemeleri kasaya işlenmez; Ödero kart tahsilatı sayılır.
```

---

## GÖREV 2 — AX Günlük Sevkiyat (her gün 11:35)

Cron: `CRON_TZ=Europe/Istanbul 35 11 * * *`

```
GÖREV: Afra Dayanıklı Tüketim (Arçelik bayisi) için BUGÜNÜN sevkiyatlarını AX sisteminden oku ve AFRA Panel'e aktar. AX sisteminde hiçbir şeyi değiştirme, sadece oku ("Kaydet", "Sil", "İş Emri Hazırla" düğmelerine ASLA basma). Şifre girme. Kullanıcıyla konuşurken "AX sistemi" de. Tüm iletişim Türkçe.

1) VERİYİ ÇEK:
- built-in-browser becerisini yükle; Claude_Browser araçlarını tek ToolSearch ile yükle (sorgu "mcp__remote-devices__Claude_Browser__"). preview_start ile https://liverapid360.operations.dynamics.com/?cmp=1126&mi=ETGTHIntegration (TH İş Emirleri) aç; resize_window 1500x1000.
- Microsoft giriş ekranı çıkarsa ŞİFRE GİRME; "AX sistemine giriş gerekiyor; Claude uygulamasının tarayıcısında giriş yapıp bana yazın" de ve dur.
- "Sorgula" sekmesine tıkla (role=tab, adı "Sorgula"). Üstteki "Başlangıç tarihi" alanını bugünden 14 gün öncesi (G.AA.YYYY) yap (triple_click, yaz, Tab); "Bitiş tarihi" bugün kalsın. En fazla 1 aylık aralık.
- Mavi "Ara" düğmesi: [...document.querySelectorAll('button')].find(b=>b.innerText.trim()==='Ara'&&b.offsetParent).click(); 15 sn bekle.
- Sanal tablo: görünür [role=grid]; başlıklar [role=columnheader] (hücre dizisiyle aynı uzunlukta); değer [role=gridcell] input.value ya da innerText; satır no aria-rowindex. Arka plan async döngü (window değişkeni; tek çağrı 45 sn'yi aşmasın): .fixedDataTableLayout_rowsContainer üzerine WheelEvent deltaY 200, her adım 900 ms, Map'e ekle; toplanan = aria-rowcount-1 olunca ya da 25 adım yeni satır gelmezse bitir; 5 adımda bir deltaY -400 + 1,5 sn. 2..aria-rowcount eksik indeks kalmamalı.
- Filtre: "Randevu tarihi" bugünle (YYYY-MM-DD) başlayan satırlar. "İptal Edildi" durumundakileri gönderme ama say. 1900-01-01 = randevusuz.

2) AKTAR (sayfanın içinden, veri sohbete gelmeden):
- Anahtar: Supabase execute_sql: select value from app_secrets where name='sevk_key';
- Her satır: {ship_time: Randevu saatinin SS:DD kısmı, store: Mağaza "YENİGÜN" içeriyorsa "PARSELLER" değilse "GÜNEŞLİ", depot: Depo, depot_type: Depo=BODIST-AVR ise "BOD" değilse "MAĞAZA", customer: Müşteri adı, order_no: Satış siparişi, work_order: İş Emri No, order_date: Sipariş Tarihi YYYY-MM-DD, item_code: Madde kodu, product: Ürün adı, amount: Net tutar sayı, rep: Satış Temsilcisi, wo_status: İş emri durumu, invoice_no: Fatura (yoksa "")}.
- fetch("https://drgnnlewwnwshwvpoljy.supabase.co/rest/v1/rpc/ingest_sevkiyat",{method:"POST",headers:{"Content-Type":"application/json",apikey:"sb_publishable_YpFFWDyHNFm2UF_L-Bdfyg_owoDrKbG"},body:JSON.stringify({p_key:KEY,p_tarih:"YYYY-MM-DD",p_rows:[...]})})  Tüm günü TEK çağrıda gönder. Veri çekme eksikse GÖNDERME. Randevu yoksa [] gönder.
- Aynı JavaScript içinde özet çıkar: satır sayısı, mağaza dağılımı, BOD / MAĞAZA, durum dağılımı, toplam tutar, faturasız satır sayısı, 30 günden eski sipariş sayısı, mağaza deposundan çıkan depolar, iptal sayısı.

3) BİTİR:
- resize_window preset "desktop", sekmeyi kapat.
- Bildirim (PushNotification varsa): "GG.AA.YYYY sevkiyat: X satır, Y TL (Parseller A / Güneşli B; BOD C, mağaza deposu D) — AFRA Panel → Sevkiyat" + 3-5 dikkat maddesi (Teknisyende olmayan iş emirleri, mağaza deposundan çıkanlar, eski siparişler, iptaller).
- Randevu yoksa: "GG.AA.YYYY için randevulu sevkiyat yok" + toplanan veriden önümüzdeki günlerin randevu sayıları.
- AX'e ya da Claude uygulamasının tarayıcısına ulaşılamıyorsa bunu bildir: "bilgisayar açılınca bu sohbete 'bugünün sevkiyatını çek' yazabilirsiniz".
```
