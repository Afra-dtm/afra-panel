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
- BAŞLIK (birebir): ["Satış siparişi","Madde kodu","Ürün Kısa Kodu","Miktar","Toplam tutar","Satış / İade","Sipariş Tarihi","İşlem Tarihi","Kota Grubu.Grup adı","Satır durumu","İptal tarihi","SalesLine RecId","Müşteri Adı","Satışı yapanın adı","Mağaza","Fatura Notu","Net tutarı","Not","Kanal"]. "Kota Grubu.Grup adı" için ekrandaki "Kota Grubu" sütununu, "Not" için ilk "Not" sütununu kullan. Tarihleri ilk 10 karakter (G.AA.YYYY), Miktar, Toplam tutar ve Net tutarı nokta ondalıklı sayı metni olarak gönder. (Fatura notu = liste altı indirim gerekçesi; banka kartı taksiti satış notundan okunur — eşlemeyi veritabanı yapar.)

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
- Bilgi: şube eşlemesini veritabanı yapar (YENİGÜN → Parseller, AFRA → Güneşli, KURUMSAL ya da "TOPLU PROJE SATIŞI" → Kurumsal, Mağaza/Kanal'da İNTERNET → İnternet Satışları; kurumsal/internet siparişlerin ödemeleri sipariş numarasından o şubeye bağlanır). VAD (vadeli açık hesap) ödemeleri kasaya işlenmez; Ödero kart tahsilatı sayılır, taksit bilgisi yoksa 3 taksit yazılır ve not düşülür; POS komisyonu "pos_oranlari" tablosundan hesaplanır.
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

---

## GÖREV 3 — AFRA Kontrol Ajanı (her gün 12:10)

Cron: `CRON_TZ=Europe/Istanbul 10 12 * * *`

> Bu görev diğer görevlerin işini BAĞIMSIZ olarak doğrular. Metnin başındaki "başka bir yapay zekanın ne yaptığını bilmiyorsun" ifadesi kasıtlıdır; kaldırmayın. (Eylül'de satış analizinin elle hesaptan ~%3 sapması üzerine istendi.)

```
Sen Afra Dayanıklı Tüketim'in BAĞIMSIZ KONTROL AJANISIN. Görevin: Arçelik AX sistemindeki satışları kaynağından kendin okuyup AFRA Panel'deki (Supabase, proje drgnnlewwnwshwvpoljy) kayıtlarla karşılaştırmak ve sonucu kaydetmek. Başka bir yapay zekanın bu verileri nasıl aktardığını bilmiyorsun ve bilmen gerekmiyor; sadece aşağıdaki kurallara göre kaynağı ve sistemi karşılaştır. Hiçbir yerde VERİ DEĞİŞTİRME: AX sisteminde kayıt açma/düzenleme yok ("Onayla", "Kaydet", "Sil" düğmelerine ASLA basma); Supabase'de yalnızca dogrulama_yaz fonksiyonunu çağır. Şifre girme; oturum kapalıysa "hata" kaydı yaz ve dur. Kullanıcıyla konuşurken "AX sistemi" de. Tüm iletişim Türkçe.

KONTROL EDİLECEK GÜN (D): Türkiye saatiyle DÜN. Ayrıca D'nin ayı için AY BAŞINDAN D'YE kadar kontrol yap (ayın 1'inde D önceki ayın son günüdür, böylece önceki ayın tamamı kapsanır).

HAZIRLIK: Anahtar: execute_sql → select value from app_secrets where name='dogrulama_key';  (K). Kayıt: select dogrulama_yaz('K', '<json>'::jsonb); (tek tırnakları ikile).
Tarayıcı: built-in-browser becerisini yükle; Claude_Browser araçlarını tek ToolSearch ile yükle (sorgu "mcp__remote-devices__Claude_Browser__"); preview_start ile sekme aç; resize_window 1500x1000; bitince preset "desktop" ve sekmeyi kapat.

ADIM 1 — Sistem tarafı (salt okunur):
select * from sistem_satis_ozet('D','D');   -- şube bazında satır, adet, satış (iptal edilen satışın eşi hariç), iade
Satır bazında: select s.kod, c.cari_ad, c.madde_kodu, c.miktar, c.tutar, c.ax_ref, c.tur from cari_hareketler c join subeler s on s.id=c.sube_id where c.kaynak='ax' and c.tarih='D';
Onay bekleyen aktarım: select batch, durum from ax_kuyruk where durum='bekliyor'; (varsa özete "onay bekleyen kasa aktarımı var" ekle; fark büyük ihtimalle bundandır).

ADIM 2 — Kaynak taraf (AX sistemi): https://liverapid360.operations.dynamics.com/?cmp=1126&mi=ETGSalesInDetail
- Alanlar: etgsalesindetail_1_StartDate_input / _EndDate_input (Sipariş başlangıç/bitiş) = D'den 35 gün önce / DG; _startCreatedDateTime_input = DG, _endCreatedDateTime_input = "DG 23:59:59" (DG = G.AA.YYYY). triple_click + yaz + Tab; JS ile doğrula. "İptalleri Göster" (#etgsalesindetail_1_salesStatusCanceled_toggle) KAPALI olmalı (aria-checked "false"). "Sorgula" düğmesi, 15 sn bekle.
- Ekran toplamları (tam değer, input.value): ...realTotalSalesQty_input (Adet), ...realTotalLineAmount_input (Tutar), ...realReturnTotalQty_input / ...realReturnTotalLineAmount_input (İade).
- Sanal tablo: görünür [role=grid]; başlıklar [role=columnheader]; hücre [role=gridcell] input.value ya da innerText; aria-rowindex. Arka plan async döngü (window değişkeni; tek çağrı 45 sn'yi aşmasın): .fixedDataTableLayout_rowsContainer üzerine WheelEvent deltaY 300, her adım rAF + 700 ms; toplanan = aria-rowcount-1 olunca ya da 25 adım yeni satır gelmezse bitir.
- "Satır durumu" İptal edildi olanları, tutarı 0 olanları (bedelsiz/bayi transferi) ve tutarı negatif iade satırlarını hariç tut. Şube: "Satışı yapanın adı" TOPLU PROJE SATIŞI → KRM; Mağaza'da YENİGÜN/PARSELLER → PRS; KURUMSAL → KRM; İNTERNET → INT; AFRA/GÜNEŞLİ → GNS.
- Topladığın satırların toplamını ekran toplamıyla karşılaştır; tutmuyorsa toplamayı tekrarla, yine tutmazsa özete yaz. Veriyi sohbete satır satır kopyalama; toplama ve karşılaştırmayı sayfadaki JavaScript içinde yap, sadece özet ve farklı satırları al.

ADIM 3 — Karşılaştır: her şube için AX satır/adet/tutar ile sistem satır/adet/satış. Fark ≤ 1 TL → "ok", değilse "fark". Farkta AX'te olup sistemde olmayan satırları (müşteri + madde kodu + tutar, ±1 TL) ve sistemde olup AX'te olmayanları listele (en fazla 50'şer).

ADIM 4 — Kaydet (her şube için bir kez): select dogrulama_yaz('K', '{"tur":"kasa_gun","tarih_bas":"D","tarih_bit":"D","sube_kod":"PRS","kaynak_etiket":"AX · Detaylı satış raporu (iptal ve iade hariç)","kaynak_satir":..,"kaynak_adet":..,"kaynak_tutar":..,"sistem_satir":..,"sistem_adet":..,"sistem_tutar":..,"durum":"ok|fark","ozet":"<tek cümle Türkçe>","detay":{"ax_var_sistemde_yok":[...],"sistemde_var_ax_yok":[...]}}'::jsonb);
AX'e ulaşılamazsa / oturum kapalıysa / tablo okunamazsa: durum "hata", ozet'te neden, kaynak_* boş.

AY BAŞINDAN D'YE (HER ÇALIŞMADA). P = D'nin ayı (YYYY-MM), aralık P'nin 1'i – D.
a) Sistem: select * from sistem_satis_ozet('<ilk gün>','D');
b) AX, GÜN GÜN (satır toplama YAPMA): aralıktaki her gün G için işlem tarihi G 00:00:00 – G 23:59:59, iptaller kapalı, Sorgula, 5-8 sn bekle, ekran toplamlarını (Adet, Tutar, İade Adet, İade Tutar) oku; window içinde biriktir. Bitince tüm aralık için bir kez daha sorgula ve günlerin toplamıyla karşılaştır. (Şube ayrımı ekran toplamında yoktur; ay kontrolü tüm şubeler toplamıdır.)
c) Karşılaştır: her gün AX Tutar ile sistem satış toplamı (tüm şubeler); AX İade ile sistem iade. Toplamda iki rakam ver: brüt (iade hariç) ve net (iade düşülmüş). Fark > 1 TL olan günler için (D hariç) o günün tablosunu satır satır okuyup eksik/fazla satışları bul (en fazla 10 gün; daha fazlaysa en büyük farklı 10 gün).
d) Kaydet: select dogrulama_yaz('K', '{"tur":"ay_satis","donem":"P","tarih_bas":"<ilk gün>","tarih_bit":"D","kaynak_etiket":"AX · gün gün ekran toplamları (iptal hariç; iade ayrı)","kaynak_adet":..,"kaynak_tutar":<iade hariç>,"sistem_satir":..,"sistem_adet":..,"sistem_tutar":..,"durum":"ok|fark","ozet":"<brüt fark, net fark, kaç gün farklı>","detay":{"ax_iade":..,"sistem_iade":..,"ax_net":..,"sistem_net":..,"gun_farklari":[{"tarih":..,"ax":..,"sistem":..,"ax_iade":..,"sistem_iade":..,"eksik_fazla":[...]}]}}'::jsonb);
Bağlantı yarıda koparsa o ana kadar okunan günleri detay'a yaz, durum "hata", ozet'te hangi güne kadar okunduğunu belirt.

ADIM 5 — Bitir: sekmeyi kapat. Herhangi bir kayıt "fark" ya da "hata" ise bildirim gönder (PushNotification varsa): hangi gün/şube, fark tutarı, ay başından brüt ve net fark, "AFRA Panel → Denetim → Bağımsız doğrulama". Hepsi "ok" ise bildirim gönderme. Son mesajında kontrolün özetini Türkçe yaz.
```

---

## GÖREV 4 — Arçelik Fiyat Taraması (haftalık; pazartesi, salı, çarşamba 14:41)

Cron: `CRON_TZ=Europe/Istanbul 41 14 * * 1-3`

> Haftada bir çekim yeterli; pazartesi, salı ve çarşamba çalışması telafi içindir (bilgisayar kapalıysa ertesi gün dener). Haftanın ilk başarılı çalışması kaydı `tamam` yapar, sonrakiler boşa geçer. Dönem kodu ISO haftadır (`select bu_hafta()` → ör. `2026-W46`), `yari = 0`. Satış & Marj hesabı her satışı, satış tarihinde ya da öncesinde çekilen en son haftanın fiyatıyla karşılaştırır (`web_donem_at`).

```
GÖREV: Afra Dayanıklı Tüketim (Arçelik bayisi) için arcelik.com.tr'deki tüm ürün fiyatlarını çek ve AFRA Panel'in Supabase veritabanına (proje drgnnlewwnwshwvpoljy) BU HAFTANIN fiyatı olarak kaydet. Fiyatlar her hafta bir kez çekilir (ISO hafta, pazartesi–pazar). Görev pazartesi, salı ve çarşamba çalışır; haftanın ilk başarılı çalışması yeterlidir, sonrakiler boşa geçer. Tüm iletişim Türkçe. arcelik.com.tr'de hiçbir şeye tıklama, sepete ekleme, form doldurma; sadece oku.

1) HAFTA:
- execute_sql: select bu_hafta();  (DONEM, ör. '2026-W46'). YARI = 0 (haftalık kayıt).
- select durum, urun_sayisi from web_fiyat_donemleri where donem='DONEM' and yari=0;  durum 'tamam' ise HİÇBİR ŞEY YAPMA, bildirim gönderme, kısa bir son mesajla bitir.
- Anahtar: select value from app_secrets where name='fiyat_key';  (KEY)

2) TARAMA: built-in-browser becerisini yükle; Claude_Browser araçlarını tek ToolSearch ile yükle (sorgu "mcp__remote-devices__Claude_Browser__"). preview_start ile https://www.arcelik.com.tr/buzdolabi aç (site izni istenirse request_access ile "site").
- Afra-dtm/afra-panel deposundaki gorevler/arcelik_fiyat_tarama.js dosyasının içeriğini al (GitHub'dan ya da depo klonundan), __KEY__, __DONEM__ ve __YARI__ yerlerine değerleri koy (KEY ve DONEM tırnak içinde metin, YARI sayı olarak 0) ve javascript_tool ile o sekmede AYNEN çalıştır. Hemen 'basladi' döner. Veriyi sohbete kopyalama.
- Her 30-40 sn'de bir kısa çağrıyla durumu oku: ({state:__WF.state, done:__WF.done, cats:__WF.cats, items:__WF.items.size, err:__WF.err.length, error:__WF.error, result:__WF.result}). state 'bitti' ya da 'hata' olana kadar bekle (genelde 10-25 dk; en fazla 45 dk). Tek çağrı 45 sn'yi aşmasın. Sekmeyi kapatma, başka sayfaya gitme.

3) KONTROL VE BİLDİRİM:
- state='bitti' ise: select durum, urun_sayisi, notu, cekim_tarihi from web_fiyat_donemleri where donem='DONEM' and yari=0;  durum 'tamam' olmalı.
- Bir önceki tamam çekimle karşılaştır:
  with c0 as (select id from web_fiyat_donemleri where donem='DONEM' and yari=0),
       p0 as (select id from web_fiyat_donemleri where durum='tamam' and id <> (select id from c0) order by cekim_tarihi desc, id desc limit 1),
       cur as (select w.* from web_fiyatlari w where w.donem_id=(select id from c0)),
       prev as (select w.* from web_fiyatlari w where w.donem_id=(select id from p0))
  select (select count(*) from cur) urun, (select count(*) from prev) onceki_urun, (select count(*) from cur c join prev p using(kod) where c.satis_fiyati<>p.satis_fiyati) degisen,
    (select count(*) from cur c join prev p using(kod) where c.satis_fiyati>p.satis_fiyati) artan, (select count(*) from cur c join prev p using(kod) where c.satis_fiyati<p.satis_fiyati) dusen,
    (select count(*) from cur c where not exists(select 1 from prev p where p.kod=c.kod)) yeni, (select count(*) from prev p where not exists(select 1 from cur c where c.kod=p.kod)) kalkan;
- Bildirim (PushNotification varsa): "Arçelik fiyatları çekildi — <hafta no>. hafta: X ürün, Y ürünün fiyatı değişti (Z arttı, W düştü), N yeni ürün. AFRA Panel → Arçelik Fiyatları". Ürün sayısı önceki çekimin %80'inden azsa uyarı ekle.
- state='hata' ya da tarayıcıya ulaşılamıyorsa: "Arçelik fiyat taraması yapılamadı: <neden>. Görev yarın tekrar deneyecek." (Çarşambaysa: "Bu hafta fiyat çekilemedi; bilgisayar açıkken bu sohbete 'fiyatları çek' yazabilirsiniz.") Başarısız haftayı 'tamam' YAPMA.
- Sekmeyi kapat. Kendi SQL'inle hiçbir tabloya yazma; kayıtları betikteki ingest_web_fiyat fonksiyonu yapar.
```
