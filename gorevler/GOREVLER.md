# AFRA Panel — Zamanlanmış görev metinleri

AFRA Panel 10 Kasım 2026'dan beri Afra Finans uygulamasının birebir kopyasıdır (veritabanı: Supabase drgnnlewwnwshwvpoljy). Görevler bu veritabanının fonksiyonlarına yazar: stage_kasa, ingest_shipments, agent_verify_log, ingest_web_price_snapshot. Anahtarlar app_secrets tablosundadır; buraya YAZILMAZ.
Görev metni değişirse update_trigger ile güncellenir (silip yeniden kurulmaz).

## GÖREV 1 — AX Kasa Aktarımı (her gün 10:30)

```
GÖREV: Afra Dayanıklı Tüketim (Arçelik bayisi) için AX sistemindeki DÜNKÜ (kapanmış önceki gün) satış ve ödemeleri oku ve AFRA Panel'in ONAY KUYRUĞUNA (Supabase kasa_staging tablosu) bırak. Kasaya kendin KAYIT YAZMA; yönetici AFRA Panel → Günlük Kasa → "İncele ve onayla" ile onaylar. AX sisteminde hiçbir şeyi değiştirme, sadece oku: "Onayla", "Kaydet", "Sil", "Yeni" düğmelerine ASLA basma. Şifre girme: Microsoft giriş ekranı çıkarsa dur ve kullanıcıya "AX sistemine giriş gerekiyor; Chrome'da AX sistemine giriş yapıp bana yazın" diye bildir. Kullanıcıyla konuşurken "AX sistemi" de. Tüm iletişim Türkçe.

HAZIRLIK
- Supabase (drgnnlewwnwshwvpoljy) execute_sql: select value from app_secrets where name='kasa_stage_key';  (K)
- D = Türkiye saatiyle DÜN (YYYY-MM-DD); DG = D'nin GG.AA.YYYY hali (ör. 4.11.2026). B = 'D-HHMM' (çalışma saati).
- select batch, status from kasa_staging where status in ('bekliyor','hazirlaniyor') and date_from='D'; 'bekliyor' varsa yeni aktarım YAPMA, "D için onay bekleyen aktarım var, önce onu onaylayın" de ve dur. ('hazirlaniyor' kalmış eski bir batch varsa yok say, yeni B ile devam et.) Ayrıca select count(*) from daily_entries where date='D' and ext_ref is not null; sıfırdan büyükse o gün zaten kasaya işlenmiştir: aktarım YAPMA, kısa bir son mesajla bitir.
- Tarayıcı: kullanıcının kendi Chrome'u (Claude in Chrome; AX oturumu orada açık). chrome-browser becerisini yükle; Chrome araçlarını tek ToolSearch ile yükle (sorgu "select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__tabs_close_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__javascript_tool,mcp__claude-in-chrome__browser_batch"). tabs_context_mcp (createIfEmpty: true) ile bu oturumun sekme grubunu aç ve oradaki sekmede çalış; kullanıcının kendi sekmelerine dokunma. Tıklama koordinatını getBoundingClientRect ile bul ve ekran görüntüsü çerçevesine ölçekle (çarpan = ekran görüntüsü çerçeve genişliği / innerWidth); birden çok tıklama/yazmayı browser_batch ile tek seferde yap. AX "Oturum sonlandırıldı" penceresi çıkarsa "Yeni oturum başlat" düğmesine bas (veri değiştirmez), sayfaya yeniden git ve kaldığın yerden devam et. İş bitince sekmeyi tabs_close_mcp ile kapat. Chrome kapalıysa ya da Claude uzantısı yanıt vermiyorsa kullanıcıya "Chrome kapalı ya da Claude uzantısı bağlı değil; Chrome açıkken bu sohbete 'kasayı aktar' yazabilirsiniz" bildir ve dur.
- Veriyi ASLA sohbete kopyalama; satırları sayfadaki JavaScript ile topla ve aynı JavaScript içinden gönder:
  fetch("https://drgnnlewwnwshwvpoljy.supabase.co/rest/v1/rpc/stage_kasa",{method:"POST",headers:{"Content-Type":"application/json",apikey:"sb_publishable_YpFFWDyHNFm2UF_L-Bdfyg_owoDrKbG"},body:JSON.stringify({p_key:K,p_batch:B,p_part:"sales"|"pays"|"done",p_rows:[...],p_meta:{...}})})
  "sales" ve "pays" için BAŞLIK satırını yalnızca İLK gönderimde koy; sonraki parçalarda başlık OLMASIN. 300'er satırlık parçalar.
- Sayfa her yeni adrese gidişte (PDF bağlantısına tıklamak dahil) window değişkenlerini kaybeder; yardımcı fonksiyonları ve gönderme fonksiyonunu her sayfada yeniden tanımla.

1) SATIŞLAR — https://liverapid360.operations.dynamics.com/?cmp=1126&mi=ETGSalesInDetail (Detaylı satış raporu)
- Alanlar (id sonekleri, input elemanları): etgsalesindetail_1_StartDate_input / _EndDate_input = Sipariş başlangıç/bitiş; _startCreatedDateTime_input / _endCreatedDateTime_input = İşlem başlangıç/bitiş. Değerleri tıklayıp (triple_click) yazarak ve Tab ile gir (koordinatı getBoundingClientRect ile bul; ekran görüntüsü çerçevesine ölçekle).
  Sipariş başlangıç = D'den 35 gün önce, Sipariş bitiş = DG; İşlem başlangıç = DG; İşlem bitiş = "DG 23:59:59" (saat yazılmazsa 00:00:00 olur ve gün dışarıda kalır). Girdikten sonra JS ile değerleri doğrula.
- "İptalleri Göster" anahtarı: #etgsalesindetail_1_salesStatusCanceled_toggle; aria-checked "true" olmalı (değilse tıkla).
- "Sorgula" düğmesine bas ([...document.querySelectorAll('button')].find(b=>b.innerText.trim()==='Sorgula'&&b.offsetParent).click()), 15 sn bekle.
- Ekran toplamlarını oku (kontrol toplamı): input id'leri ...realTotalSalesQty_input (adet), ...realTotalLineAmount_input (tutar, iptaller hariç), ...realCancelTotalLineAmount_input (iptal tutarı, eksi), ...realReturnTotalLineAmount_input (iade).
- Sanal tablo (fixedDataTable): görünür [role=grid]; başlıklar [role=columnheader] innerText (ilk sütun boş = seçim kutusu, hücre dizisi başlık dizisiyle aynı uzunlukta); hücre değeri [role=gridcell] içindeki input.value ya da innerText; satır no aria-rowindex (2'den başlar). Arka plan async döngü: .fixedDataTableLayout_rowsContainer üzerine WheelEvent deltaY 300, her adım requestAnimationFrame + 700 ms, satırları Map'e ekle ("Satır yükleniyor" olanları atla); toplanan = aria-rowcount-1 olunca ya da 25 adım yeni satır gelmezse bitir. Durumu ayrı kısa çağrılarla oku (tek çağrı 45 sn'yi aşmasın). 2..aria-rowcount arasında eksik indeks kalmamalı.
- Doğrula: iptal edilmemiş satırların Miktar toplamı = ekran adedi, Toplam tutar toplamı = ekran tutarı. Tutmuyorsa toplamayı tekrarla; yine tutmazsa note'a yaz.
- BAŞLIK (birebir): ["Satış siparişi","Madde kodu","Ürün Kısa Kodu","Miktar","Toplam tutar","Satış / İade","Sipariş Tarihi","İşlem Tarihi","Kota Grubu.Grup adı","Satır durumu","İptal tarihi","SalesLine RecId","Müşteri Adı","Satışı yapanın adı","Mağaza","Fatura Notu"] — tam bu 16 sütun, bu sırayla. "Kota Grubu.Grup adı" için ekrandaki "Kota Grubu" sütununu kullan. Tarihleri ilk 10 karakter (G.AA.YYYY), Miktar ve Toplam tutarı nokta ondalıklı sayı metni olarak gönder. (Fatura notu = liste altı indirim gerekçesi.)

2) ÖDEMELER — https://liverapid360.operations.dynamics.com/?cmp=1126&mi=ETGCashTableReportForm (Kasa Föyü Raporu)
- Her mağaza için ayrı: önce 21134410 (Parseller), sonra 21134409 (Güneşli). Alanlar: input id sonu _1_storeId_input (Mağaza), _1_TransDate_input, _1_toTransDate_input. Mağaza kodunu yaz, Tab; tarihleri DG yaz, Tab. Sonra "Sorgula" düğmesi (Onayla'ya DEĞİL).
- "Satış Bilgileri" bölümündeki "Kasa föyü satış toplamına göre ayrıntı" bağlantısına tıkla; "ÖDEME PLANI RAPORU" PDF'i sayfadaki iframe'de (src'si "pdfjs" içeren) açılır. PDFViewerApplication.pdfDocument hazır olana kadar bekle (iframe.contentWindow üzerinden; üst penceredeki boş PDFViewerApplication'ı kullanma).
- Her sayfa için getPage(i).getTextContent(): "Mağaza No" metninin y'si başlık satırıdır; aynı y'deki metinler sütun başlıklarıdır (x sırasıyla; sütun aralığı = başlık x-6 .. sonraki başlık x-6). Satır başlangıçları: başlığın altında, ilk sütunda 8 haneli mağaza numarası olan metinler. Bir satırın hücreleri o satırın y'si ile bir sonraki satırın y'si arasındaki metinlerdir (çok satırlı hücreleri boşlukla birleştir).
- PDF'in sonraki sayfalarında başlık satırı OLMAYABİLİR: sütun aralıklarını ilk sayfadan al, o sayfaları yukarıdan itibaren oku (yoksa ikinci sayfadaki Ödero satırları kaybolur). Sayfa altbilgisi (ör. "1 / 2") son satıra karışabilir: Mağaza No = metindeki ilk 8 hane. Bölünen kelimeleri düzelt ("Ödero tahsilat kesinleştirm e" → "Ödero tahsilat kesinleştirme").
- ÖNEMLİ: Tablonun altında "Ödeme tiplerine göre ödeme toplamı" özet bölümü vardır. Bu metnin y'sinin ALTINDAKİ hiçbir metni satırlara katma (son satıra karışıyor).
- BAŞLIK: ["İşlem No","Sipariş No","İşlem Tarihi","Müşteri Adı","Mağaza No","Mağaza Adı","Ödeme","Ödeme Tipi","Ödenecek Tutar","Taksit sayısı"] (PDF'teki "Taksit" sütunu = Taksit sayısı). Ödenecek Tutar "TL14.300,00" biçimindedir → 14300 (eksi işareti korunur). Mağaza No tam 8 hane olmalı, İşlem No "^\d{8}-\d+-\s?\d+$" biçiminde olmalı; değilse satırı düzelt.
- Kontrol: Kasa Föyü ekranındaki "Satış Bilgileri" tablosunun ödeme yöntemi toplamları (Nakit, Banka kartı, VAD…) ile okunan satırları karşılaştır; farkı note'a yaz.
- Mağaza değiştirmek için sayfaya adresle yeniden git (navigate ile aynı URL). İkinci mağazanın satırlarını BAŞLIKSIZ gönder.
- Rapor açılamazsa o mağazanın ödemelerini boş geç, note'a yaz.

3) BİTİR
- p_part "done", p_rows [], p_meta {run_label:"DG — SS:DD sabah otomatik", date_from:"D", date_to:"D", src_rows:<ekran adedi>, src_amount:<ekran tutarı>, note:"<kısa Türkçe not: kaç satış/kaç TL, kaç iptal, kaç ödeme satırı (mağaza bazında), uyarılar>"}.
- Doğrula: select status, jsonb_array_length(sales_aoa) s, jsonb_array_length(pays_aoa) o from kasa_staging where batch='B'; status 'bekliyor' olmalı.
- D günü satış yoksa (pazar/tatil) yine "done" gönder (note "satış yok").
- Sekmeyi kapat. Bildirim (PushNotification varsa): "DG kasa aktarımı onayınızı bekliyor: X satış (Y TL), Z iptal, W ödeme — AFRA Panel → Günlük Kasa". AX'e ulaşılamadıysa / oturum kapalıysa ya da Chrome kapalıysa bunu bildir.
- Bilgi: satırları kasaya AFRA Panel'in kendisi işler (yönetici onaylayınca); mağaza eşlemesi, kart/taksit ve POS komisyonu orada hesaplanır. Sen yalnızca ham satırları kuyruğa bırakırsın.
```

## GÖREV 2 — AX Günlük Sevkiyat (her gün 11:35)

```
GÖREV: Afra Dayanıklı Tüketim (Arçelik bayisi) için BUGÜNÜN sevkiyatlarını AX sisteminden oku ve AFRA Panel'e aktar. AX sisteminde hiçbir şeyi değiştirme, sadece oku ("Kaydet", "Sil", "İş Emri Hazırla" düğmelerine ASLA basma). Şifre girme. Kullanıcıyla konuşurken "AX sistemi" de. Tüm iletişim Türkçe.

1) VERİYİ ÇEK:
- Tarayıcı: kullanıcının kendi Chrome'u (Claude in Chrome; AX oturumu orada açık). chrome-browser becerisini yükle; Chrome araçlarını tek ToolSearch ile yükle (sorgu "select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__tabs_close_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__javascript_tool,mcp__claude-in-chrome__browser_batch"). tabs_context_mcp (createIfEmpty: true) ile bu oturumun sekme grubunu aç ve oradaki sekmede çalış; kullanıcının kendi sekmelerine dokunma. Tıklama koordinatını getBoundingClientRect ile bul ve ekran görüntüsü çerçevesine ölçekle (çarpan = ekran görüntüsü çerçeve genişliği / innerWidth); birden çok tıklama/yazmayı browser_batch ile tek seferde yap. AX "Oturum sonlandırıldı" penceresi çıkarsa "Yeni oturum başlat" düğmesine bas (veri değiştirmez), sayfaya yeniden git ve kaldığın yerden devam et. İş bitince sekmeyi tabs_close_mcp ile kapat. Chrome kapalıysa ya da Claude uzantısı yanıt vermiyorsa kullanıcıya "Chrome kapalı ya da Claude uzantısı bağlı değil; Chrome açıkken bu sohbete 'bugünün sevkiyatını çek' yazabilirsiniz" bildir ve dur.
- Sekmede https://liverapid360.operations.dynamics.com/?cmp=1126&mi=ETGTHIntegration (TH İş Emirleri) adresine git.
- Microsoft giriş ekranı çıkarsa ŞİFRE GİRME; "AX sistemine giriş gerekiyor; Chrome'da AX sistemine giriş yapıp bana yazın" de ve dur.
- "Sorgula" sekmesine tıkla (role=tab, adı "Sorgula"). Üstteki "Başlangıç tarihi" alanını bugünden 14 gün öncesi (G.AA.YYYY) yap (triple_click, yaz, Tab); "Bitiş tarihi" bugün kalsın. En fazla 1 aylık aralık.
- Mavi "Ara" düğmesi: [...document.querySelectorAll('button')].find(b=>b.innerText.trim()==='Ara'&&b.offsetParent).click(); 15 sn bekle.
- Sanal tablo: görünür [role=grid]; başlıklar [role=columnheader] (hücre dizisiyle aynı uzunlukta); değer [role=gridcell] input.value ya da innerText; satır no aria-rowindex. Arka plan async döngü (window değişkeni; tek çağrı 45 sn'yi aşmasın): .fixedDataTableLayout_rowsContainer üzerine WheelEvent deltaY 200, her adım 900 ms, Map'e ekle; toplanan = aria-rowcount-1 olunca ya da 25 adım yeni satır gelmezse bitir; 5 adımda bir deltaY -400 + 1,5 sn. aria-rowcount kaydırdıkça BÜYÜR (ör. 215 → 254): her adımda güncel değeri oku; sonda deltaY 400 ile 10 adım yeni satır gelmeyene kadar devam et. 2..aria-rowcount eksik indeks kalmamalı.
- Filtre: "Randevu tarihi" bugünle (YYYY-MM-DD) başlayan satırlar. "İptal Edildi" durumundakileri gönderme ama say. 1900-01-01 = randevusuz.

2) AKTAR (sayfanın içinden, veri sohbete gelmeden):
- Anahtar: Supabase (proje drgnnlewwnwshwvpoljy) execute_sql: select value from app_secrets where name='ship_key';
- Her satır: {ship_time: Randevu saatinin SS:DD kısmı, store: Mağaza "YENİGÜN" içeriyorsa "PARSELLER" değilse "GÜNEŞLİ", depot: Depo, depot_type: Depo=BODIST-AVR ise "BOD" değilse "MAĞAZA", customer: Müşteri adı, order_no: Satış siparişi, work_order: İş Emri No, order_date: Sipariş Tarihi YYYY-MM-DD, item_code: Madde kodu, product: Ürün adı, amount: Net tutar sayı, rep: Satış Temsilcisi, wo_status: İş emri durumu, invoice_no: Fatura (yoksa ""), description: "Açıklama" sütunundaki metin olduğu gibi (boşsa ""), cust_account: Müşteri hesabı (ör. 1126-M0136403)}. "Açıklama" sütunu grid'de görünmüyorsa (yatay kaydırma gerekirse) onu da topla; bulunamazsa description gönderme ve bildirimde belirt.
- fetch("https://drgnnlewwnwshwvpoljy.supabase.co/rest/v1/rpc/ingest_shipments",{method:"POST",headers:{"Content-Type":"application/json",apikey:"sb_publishable_YpFFWDyHNFm2UF_L-Bdfyg_owoDrKbG"},body:JSON.stringify({p_key:KEY,p_date:"YYYY-MM-DD",p_rows:[...]})})  Tüm günü TEK çağrıda gönder. Veri çekme eksikse GÖNDERME. Randevu yoksa [] gönder.
- Aynı JavaScript içinde özet çıkar: satır sayısı, mağaza dağılımı, BOD / MAĞAZA, durum dağılımı, toplam tutar, faturasız satır sayısı, 30 günden eski sipariş sayısı, mağaza deposundan çıkan depolar, iptal sayısı.

2b) ÖDEME KONTROLÜ (Tahsilat yönetimi; yalnızca oku):
- Gönderilen satırlardaki farklı Müşteri hesaplarını listele. Aynı sekmede https://liverapid360.operations.dynamics.com/?cmp=1126&mi=ETGCollectionManagement adresine git (8 sn bekle). Üstteki anahtarlar varsayılanında kalsın ("Tamamlanmış tahsilatları gösterme" = Evet).
- Her hesap için: alanı JavaScript ile odakla ve seç (const i=document.querySelector('input[name=CustAccount]');i.focus();i.select()) — alana TIKLAMA (dolu alan bağlantıdır, Müşteriler sayfasını açar). Sonra computer type ile hesabı yaz, Tab, 10 sn bekle. input[name=CustAccount] değerinin yazdığın hesap olduğunu doğrula; değilse o hesabı 1 kez yeniden dene.
- Üst tablo (görünür ilk [role=grid]): başlıklar [role=columnheader], hücreler [role=gridcell] (input.value / checkbox checked / innerText). Kullanılan sütunlar: "Ödeme yöntemi adı", "Ödeme planı belge tipi", "Vade tarihi", "Kalan tutar" (1.234,56 biçimi), "Gecikme gün sayısı", "Sipariş no", "Tahsil edildi". Uyarı satırı = (Ödeme yöntemi adı veya Ödeme planı belge tipi /\bVAD\b|SENET/i ile eşleşir; ör. "VAD (Vadeli Açık Hesap)" / "VAD", K SENET) VE Kalan tutar > 0 VE Tahsil edildi değil. Banka kartı / Ödero / POS satırları uyarı değildir.
- Hesap başına: {cust_account, customer, open_amount: uyarı satırlarının kalan toplamı, overdue_amount: bunlardan Gecikme gün sayısı > 0 olanların kalan toplamı, max_delay, detail: [{method, order_no, due, remaining, delay}]}. Uyarı yoksa open_amount 0 ve detail [] gönder (eski uyarı temizlensin).
- fetch("https://drgnnlewwnwshwvpoljy.supabase.co/rest/v1/rpc/set_customer_pay_alerts",{method:"POST",headers:{"Content-Type":"application/json",apikey:"sb_publishable_YpFFWDyHNFm2UF_L-Bdfyg_owoDrKbG"},body:JSON.stringify({p_key:KEY,p_rows:[...]})}) — anahtar ship_key ile aynı. Bir hesap okunamadıysa o hesabı GÖNDERME ve bildirimde belirt.

3) BİTİR:
- Sekmeyi kapat.
- Bildirim (PushNotification varsa): "GG.AA.YYYY sevkiyat: X satır, Y TL (Parseller A / Güneşli B; BOD C, mağaza deposu D) — AFRA Panel → Sevkiyat Kontrolü" + 3-5 dikkat maddesi (ÖNCE ödenmemiş VAD / K SENET olan müşteriler ve tutarları, sonra Teknisyende olmayan iş emirleri, mağaza deposundan çıkanlar, eski siparişler, iptaller).
- Randevu yoksa: "GG.AA.YYYY için randevulu sevkiyat yok" + toplanan veriden önümüzdeki günlerin randevu sayıları.
- AX'e ya da Chrome'a ulaşılamıyorsa bunu bildir: "bilgisayar açılınca bu sohbete 'bugünün sevkiyatını çek' yazabilirsiniz".
```

## GÖREV 3 — AFRA Kontrol Ajanı (her gün 12:10)

```
Sen Afra Dayanıklı Tüketim'in BAĞIMSIZ KONTROL AJANISIN. Görevin: Arçelik AX sistemindeki satışları kaynağından kendin okuyup AFRA Panel'deki (Supabase, proje drgnnlewwnwshwvpoljy) kayıtlarla karşılaştırmak ve sonucu kaydetmek. Başka bir yapay zekanın bu verileri nasıl aktardığını bilmiyorsun ve bilmen gerekmiyor; sadece aşağıdaki kurallara göre kaynağı ve sistemi karşılaştır. Hiçbir yerde VERİ DEĞİŞTİRME: AX sisteminde kayıt açma/düzenleme yok ("Onayla", "Kaydet", "Sil" düğmelerine ASLA basma); Supabase'de yalnızca agent_verify_log fonksiyonunu çağır. Şifre girme; oturum kapalıysa "hata" kaydı yaz ve dur. Kullanıcıyla konuşurken "AX sistemi" de. Tüm iletişim Türkçe.

KONTROL EDİLECEK GÜN (D): Türkiye saatiyle DÜN. Ayrıca D'nin ayı için AY BAŞINDAN D'YE kadar kontrol yap (ayın 1'inde D önceki ayın son günüdür, böylece önceki ayın tamamı kapsanır).

HAZIRLIK: Anahtar: execute_sql → select value from app_secrets where name='verify_key';  (K). Kayıt: select agent_verify_log('K', '<json>'::jsonb); (tek tırnakları ikile).
Tarayıcı: kullanıcının kendi Chrome'u (Claude in Chrome; AX oturumu orada açık). chrome-browser becerisini yükle; Chrome araçlarını tek ToolSearch ile yükle (sorgu "select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__tabs_close_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__javascript_tool,mcp__claude-in-chrome__browser_batch"). tabs_context_mcp (createIfEmpty: true) ile bu oturumun sekme grubunu aç ve oradaki sekmede çalış; kullanıcının kendi sekmelerine dokunma. Tıklama koordinatını getBoundingClientRect ile bul ve ekran görüntüsü çerçevesine ölçekle (çarpan = ekran görüntüsü çerçeve genişliği / innerWidth); birden çok tıklama/yazmayı browser_batch ile tek seferde yap. AX "Oturum sonlandırıldı" penceresi çıkarsa "Yeni oturum başlat" düğmesine bas (veri değiştirmez), sayfaya yeniden git ve kaldığın yerden devam et. İş bitince sekmeyi tabs_close_mcp ile kapat. Chrome kapalıysa ya da Claude uzantısı yanıt vermiyorsa kullanıcıya "Chrome kapalı ya da Claude uzantısı bağlı değil; Chrome açıkken bu sohbete 'kontrolü çalıştır' yazabilirsiniz" bildir ve dur.

ADIM 1 — Sistem tarafı (salt okunur). Mağazalar (areas.name): "Parseller Mağaza", "Güneşli Mağaza", "Kurumsal Satış", "İNTERNET SATIŞLARI".
Özet: select a.name, count(*) filter (where e.kind='SATIŞ') satir, coalesce(sum(case when e.kind='SATIŞ' then e.qty else -e.qty end),0) adet, coalesce(sum(case when e.kind='SATIŞ' then e.amount else -e.amount end),0) tutar from areas a left join daily_entries e on e.area_id=a.id and e.date='D' and e.kind in ('SATIŞ','İPTAL') group by a.name;
Satır bazında: select a.name, e.customer, e.madde_kodu, e.qty, e.amount, e.kind, e.ext_ref from daily_entries e join areas a on a.id=e.area_id where e.date='D' and e.kind in ('SATIŞ','İPTAL');
Onay bekleyen aktarım: select batch, status from kasa_staging where status='bekliyor'; (varsa özete "onay bekleyen kasa aktarımı var" ekle; fark büyük ihtimalle bundandır).

ADIM 2 — Kaynak taraf (AX sistemi): https://liverapid360.operations.dynamics.com/?cmp=1126&mi=ETGSalesInDetail
- Alanlar: etgsalesindetail_1_StartDate_input / _EndDate_input (Sipariş başlangıç/bitiş) = D'den 35 gün önce / DG; _startCreatedDateTime_input = DG, _endCreatedDateTime_input = "DG 23:59:59" (DG = G.AA.YYYY). triple_click + yaz + Tab; JS ile doğrula. "İptalleri Göster" (#etgsalesindetail_1_salesStatusCanceled_toggle) KAPALI olmalı (aria-checked "false"). "Sorgula" düğmesi, 15 sn bekle.
- Ekran toplamları (tam değer, input.value): ...realTotalSalesQty_input (Adet), ...realTotalLineAmount_input (Tutar), ...realReturnTotalQty_input / ...realReturnTotalLineAmount_input (İade).
- Sanal tablo: görünür [role=grid]; başlıklar [role=columnheader]; hücre [role=gridcell] input.value ya da innerText; aria-rowindex. Arka plan async döngü (window değişkeni; tek çağrı 45 sn'yi aşmasın): .fixedDataTableLayout_rowsContainer üzerine WheelEvent deltaY 300, her adım rAF + 700 ms; toplanan = aria-rowcount-1 olunca ya da 25 adım yeni satır gelmezse bitir.
- "Satır durumu" İptal edildi olanları, tutarı 0 olanları (bedelsiz/bayi transferi) ve tutarı negatif iade satırlarını hariç tut. Mağaza: "Satışı yapanın adı" TOPLU PROJE SATIŞI → Kurumsal Satış; Mağaza'da YENİGÜN/PARSELLER → Parseller Mağaza; KURUMSAL → Kurumsal Satış; İNTERNET → İNTERNET SATIŞLARI; AFRA/GÜNEŞLİ → Güneşli Mağaza.
- Topladığın satırların toplamını ekran toplamıyla karşılaştır; tutmuyorsa toplamayı tekrarla, yine tutmazsa özete yaz. Veriyi sohbete satır satır kopyalama; toplama ve karşılaştırmayı sayfadaki JavaScript içinde yap, sadece özet ve farklı satırları al.

ADIM 3 — Karşılaştır: her mağaza için AX satır/adet/tutar ile sistem satır/adet/satış. Fark ≤ 1 TL → "ok", değilse "fark". Farkta AX'te olup sistemde olmayan satırları (müşteri + madde kodu + tutar, ±1 TL) ve sistemde olup AX'te olmayanları listele (en fazla 50'şer).

ADIM 4 — Kaydet (her mağaza için bir kez): select agent_verify_log('K', '{"kind":"kasa_gun","date_from":"D","date_to":"D","area":"Parseller Mağaza","source_label":"Dynamics · ETGSalesInDetail (iptal ve iade hariç)","src_rows":..,"src_qty":..,"src_amount":..,"sys_rows":..,"sys_qty":..,"sys_amount":..,"status":"ok|fark","summary":"<tek cümle Türkçe>","details":{"dynamicste_var_kasada_yok":[{"musteri":..,"madde_kodu":..,"adet":..,"tutar":..}],"kasada_var_dynamicste_yok":[...]}}'::jsonb);
AX'e ulaşılamazsa / oturum kapalıysa / tablo okunamazsa: status "hata", summary'de neden, src_* boş ("").

AY BAŞINDAN D'YE (HER ÇALIŞMADA). P = D'nin ayı (YYYY-MM), aralık P'nin 1'i – D.
a) Sistem, gün gün (tüm mağazalar): select e.date, count(*) filter (where e.kind='SATIŞ') satir, sum(case when e.kind='SATIŞ' then e.qty else -e.qty end) adet, sum(e.amount) filter (where e.kind='SATIŞ') satis, coalesce(sum(e.amount) filter (where e.kind='İPTAL'),0) iptal from daily_entries e where e.date between '<ilk gün>' and 'D' and e.kind in ('SATIŞ','İPTAL') group by e.date order by e.date;
b) AX, GÜN GÜN (satır toplama YAPMA): aralıktaki her gün G için işlem tarihi G 00:00:00 – G 23:59:59, iptaller kapalı, Sorgula, 5-8 sn bekle, ekran toplamlarını (Adet, Tutar, İade Adet, İade Tutar) oku; window içinde biriktir. Bitince tüm aralık için bir kez daha sorgula ve günlerin toplamıyla karşılaştır. (Mağaza ayrımı ekran toplamında yoktur; ay kontrolü tüm mağazalar toplamıdır.)
c) Karşılaştır: her gün AX Tutar ile sistem satış toplamı (tüm mağazalar); AX İade ile sistemdeki İPTAL toplamı. Toplamda iki rakam ver: brüt (iade hariç) ve net (iade düşülmüş). Fark > 1 TL olan günler için (D hariç) o günün tablosunu satır satır okuyup eksik/fazla satışları bul (en fazla 10 gün; daha fazlaysa en büyük farklı 10 gün).
d) Kaydet: select agent_verify_log('K', '{"kind":"ay_satis","period":"P","date_from":"<ilk gün>","date_to":"D","source_label":"Dynamics · ETGSalesInDetail gün gün ekran toplamları (iptal hariç; iade ayrı)","src_qty":..,"src_amount":<iade hariç>,"sys_rows":..,"sys_qty":..,"sys_amount":..,"status":"ok|fark","summary":"<brüt fark, net fark, kaç gün farklı>","details":{"dynamics_iade":..,"sistem_iptal":..,"dynamics_net":..,"sistem_net":..,"gunler":[{"tarih":..,"dynamics":..,"sistem":..,"dynamics_adet":..,"sistem_adet":..,"eksik_fazla":[...]}]}}'::jsonb);
Bağlantı yarıda koparsa o ana kadar okunan günleri details'e yaz, status "hata", summary'de hangi güne kadar okunduğunu belirt.

ADIM 5 — Bitir: sekmeyi kapat. Herhangi bir kayıt "fark" ya da "hata" ise bildirim gönder (PushNotification varsa): hangi gün/mağaza, fark tutarı, ay başından brüt ve net fark, "AFRA Panel → Kontrol → Doğrulama". Hepsi "ok" ise bildirim gönderme. Son mesajında kontrolün özetini Türkçe yaz.
```

## GÖREV 4 — Arçelik Fiyat Taraması (haftalık; pazartesi, salı, çarşamba 14:41)

```
GÖREV: Afra Dayanıklı Tüketim (Arçelik bayisi) için arcelik.com.tr'deki tüm ürün fiyatlarını çek ve AFRA Panel'in Supabase veritabanına (proje drgnnlewwnwshwvpoljy) kaydet. Fiyatlar haftada bir çekilir. Görev pazartesi, salı ve çarşamba çalışır; haftanın ilk başarılı çalışması yeterlidir, sonrakiler boşa geçer. Tüm iletişim Türkçe. arcelik.com.tr'de hiçbir şeye tıklama, sepete ekleme, form doldurma; sadece oku.

1) DÖNEM:
- Türkiye saatiyle bugün: DONEM = 'YYYY-MM' (bu ay), YARI = ayın günü 16 ya da sonrasıysa 2, değilse 1. (AFRA Panel fiyatları ayın iki yarısı için ayrı tutar; her haftalık çekim içinde bulunulan yarının kaydını yeniler.)
- execute_sql: select status, product_count, taken_at, (taken_at at time zone 'Europe/Istanbul')::date >= date_trunc('week', (now() at time zone 'Europe/Istanbul'))::date as bu_hafta from web_price_snapshots where period='DONEM' and half=YARI;  status 'tamam' VE bu_hafta true ise HİÇBİR ŞEY YAPMA, bildirim gönderme, kısa bir son mesajla bitir.
- Karşılaştırma için önceki fiyatları şimdi sakla (tarama bunları değiştirir): select count(*) from web_prices;  (ONCEKI_URUN) ve select coalesce(max(id),0) from web_price_history;  (H0)
- Anahtar: select value from app_secrets where name='web_prices_key';  (KEY)

2) TARAMA: built-in-browser becerisini yükle; Claude_Browser araçlarını tek ToolSearch ile yükle (sorgu "mcp__remote-devices__Claude_Browser__"). preview_start ile https://www.arcelik.com.tr/buzdolabi aç (site izni istenirse request_access ile "site").
- Afra-dtm/afra-panel deposundaki gorevler/arcelik_fiyat_tarama.js dosyasının içeriğini al (GitHub'dan ya da depo klonundan), __KEY__, __DONEM__ ve __YARI__ yerlerine değerleri koy (KEY ve DONEM tırnak içinde metin, YARI sayı olarak 1 ya da 2) ve javascript_tool ile o sekmede AYNEN çalıştır. Hemen 'basladi' döner. Veriyi sohbete kopyalama.
- Her 30-40 sn'de bir kısa çağrıyla durumu oku: ({state:__WF.state, done:__WF.done, cats:__WF.cats, items:__WF.items.size, err:__WF.err.length, error:__WF.error, result:__WF.result}). state 'bitti' ya da 'hata' olana kadar bekle (genelde 10-25 dk; en fazla 45 dk). Tek çağrı 45 sn'yi aşmasın. Sekmeyi kapatma, başka sayfaya gitme.

3) KONTROL VE BİLDİRİM:
- state='bitti' ise: select status, product_count, note, taken_at from web_price_snapshots where period='DONEM' and half=YARI;  status 'tamam' olmalı.
- Değişenler: select count(*) degisen, count(*) filter (where h.sale_price > p.sale_price) artan, count(*) filter (where h.sale_price < p.sale_price) dusen from web_price_history h left join lateral (select sale_price from web_price_history x where x.code=h.code and x.id<h.id order by x.id desc limit 1) p on true where h.id > H0;  Yeni ürün sayısı = (select count(*) from web_prices) − ONCEKI_URUN (eksi çıkarsa 0 say).
- Bildirim (PushNotification varsa): "Arçelik fiyatları çekildi: X ürün, Y ürünün fiyatı değişti (Z arttı, W düştü), N yeni ürün. AFRA Panel → Arçelik Fiyatları". Ürün sayısı ONCEKI_URUN'ün %80'inden azsa uyarı ekle.
- state='hata' ya da tarayıcıya ulaşılamıyorsa: "Arçelik fiyat taraması yapılamadı: <neden>. Görev yarın tekrar deneyecek." (Çarşambaysa: "Bu hafta fiyat çekilemedi; bilgisayar açıkken bu sohbete 'fiyatları çek' yazabilirsiniz.") Başarısız çekimi 'tamam' YAPMA.
- Sekmeyi kapat. Kendi SQL'inle hiçbir tabloya yazma; kayıtları betikteki ingest_web_price_snapshot fonksiyonu yapar.
```
