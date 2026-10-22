# Doğrulama — 22 Ekim 2026

Son teslim: `THE-BLACK-SILENCE.html`, **2.289.458 bayt**.

Test edilen HTML'nin SHA256 değeri: `9e0a2ac7f16a5271eb60ceda9be8b76ebbda46da5840993ef6cf606af76c7e73`. Aşağıdaki bütün son entegrasyon kontrolleri bu dosya üzerinde çalıştırıldı. Kaynak ve dosya kimlikleri `docs/build-info.json`, yerel test kayıtlarının kimlikleri `.dream-loop/final-test-provenance.json` içinde tutulur.

## Son düzeltmeler

- İlk iki silahın sağ eli basık, çapraz deri el sırtı ve kabzayı arkadan kavrayan parmaklarla yeniden kuruldu; önkol bileğe doğru daralır. Doldurma sırasında hazneye yerleşen fişek korunur, destek eli kapanış boyunca görünür. Kameraya doğru büyüyen kovan ve bunun silahı kadrajdan aşağı itmesi düzeltildi.
- Doldurma hareketleri ile kayıt kaynaklı kilit, menteşe, kovan ve fişek temasları ortak olay zamanlarını kullanır. Özgün effects ses yolu, ses ayarları ve diğer silahların sesleri korunur. CC0 kayıt kökenleri ve işleme bilgisi docs/audio-sources.json içindedir.
- Kript cephesindeki taş kaide/kornişler kararmış mezar levhalarını çerçeveler; şapelde kırık taş altar çerçevesi bulunur. Manastırda mühürlü levhalar ve açık kemik rafları, zindanda alçak taş kuşaklar ile kontrollü su izleri duvar kompozisyonlarını güçlendirir.
- Bu turdaki çevre çalışması [Atari'nin resmi Blood görsellerindeki](https://atari.com/products/blood-refreshed-supply) bağlı mimari ve malzeme bölgelerini tasarım referansı aldı. Ticari görsel/varlık kopyalanmadı. Yeni detaylar mevcut atlas ve özgün küçük su izi dokusu kullanır; yeni pointlight veya collider eklenmedi.

## Korunan içerik

Eklenen kaynak bloğu ve iki yeni kontrol satırı çıkarıldığında dosya `.dream-loop/original.html` ile birebir eşleşiyor. Özgün motor, harita tanımları, sesler ve diğer gömülü içerik korunuyor; yeni davranışlar başlangıçtan önce eklenen modüllerle uygulanıyor.

Gömülü modül metni dondurulmuş `src/` kaynaklarıyla birebir eşleşiyor. Arka arkaya derleme aynı HTML'yi üretiyor. Önceki çalışan oyuna kesin geri dönüş dosyası `.dream-loop/before-polish-5/THE-BLACK-SILENCE.html`; o klasördeki kaynak/araç/belge kopyaları yalnız çalışma anı snapshotıdır.

## Son entegrasyon kontrolleri

| Kontrol | Sonuç |
| --- | --- |
| Dövüş | 35 doğrulama geçti: gerçek silah isabeti, can/stagger, E hedefi, bitirici iptali/tamamlanması, kamera geçişi, tek ölüm sayımı, silah kilitleri ve tekme çarpışmaları |
| Düşman animasyonları | 16 doğrulama geçti: mesafeye bağlı adım, yavaşlama, saldırı hazırlığı, değişmeyen hasar/hitbox, yönlü tepki, stagger ve animasyon öncelikleri |
| Duvar/iniş | 72 geometri matrisi vakası + 4 regresyon ve 3 gerçek animasyon döngüsü vakası geçti; tarayıcı hatası yok |
| Prologue yapısı | Geçişler, yükseklikler, çıkışlar, 21 düşman, erişilebilir eşyalar, dekor zemini ve bağlamsal ipuçları doğrulandı |
| Prologue yürüyüşü | Gerçek hareketle 15 kontrol noktası, şapelde tüfek alımı ve E ile çıkış animasyonu geçti; tarayıcı hatası yok |
| Kript ışığı | Başlangıç görüntüsündeki ölçüm bölgesinde 4.412 kızıl piksel; derinlik testi açık, başka bölüme sahne nesnesi taşınmıyor |
| Gerçek dövüş döngüsü | Drop kick oyuncuyu yaklaşık 6,63 m, hazırlanmış test düşmanını yaklaşık 4,55 m ilerletti; E girdisi bitiriciyi tamamladı |
| Bölüm açılışları | 11 bölüm açılıp kare çizdi; geçerli oyuncu konumu ve sıfır tarayıcı hatası |
| Sonraki iki bölüm | Zindan ve manastır harita/dekor korunumu, geçerli zemin, sıfır ek collider/ışık ve yeniden yükleme kontrolü geçti; sabit kamera görselleri alındı |
| Doldurma sesi | 42 gerçek WebAudio/native silah doğrulaması; iki gerçek RAF doldurmada 7 + 7 olay, geride aktif ses kalmadı. Son HTML’den audit WAV üretildi |
| Eski kayıt | v1 ayar ve bölüm ilerlemesi yüklendi; ses ayarı yeniden açılışta korundu; önceden açılmış bölüm başlatıldı |
| Çevrimdışı açılış | 1920×1080 normal açılış geçti; QA arayüzü olmadan oyun başladı |

Duvar testi normal zombi ve hazırlanmış geometri kullanır. Gerçek animasyon döngüsündeki üç deneme, aynı özel duvara yaklaşan canlı, duvarda ölen ve tekmede ölen hedefleri sınar. Bu, bütün düşman türleri ve bütün haritalar için performans garantisi değildir.

Prologue'da şapele ve ilk karşılaşmaya kadar AI çalıştı; oyuncu ilk düşmana 100 canla ulaştı. Sonraki köprüler, arena, doğu merdivenleri, yan sığınak ve çıkış, çarpışma/yükseklik denetimi için AI durdurularak geçildi. Oyuncu geçişler boyunca ışınlanmadı. Bu bölüm tam kampanya oynanışı veya kapsamlı zorluk dengesi testi değildir.

Bot tabanı yan/alt/topuk incelemesi önceki turda yapıldı; bu tur bot geometrisi değiştirilmedi. Eski bot tabanı görseli bu değişmeyen modeli gösterir.

## Ölçülen performans

Windows/Chrome, 1280×720 tarayıcı alanı, varsayılan oyun iç çözünürlüğü. Diğer test tarayıcıları kapalıyken son smoke çalıştırmasının kısa pencerelerinde:

- İlk drop kick: yaklaşık 38.2 FPS; en uzun kare 100 ms. Ekran görüntüsü alımı bu aralığa dahildir.
- İlk bitirici: yaklaşık 46.4 FPS; en uzun kare 50 ms.
- Isınmış bitiriciler: yaklaşık 48.3–59.3 FPS.
- Bölüm açılışı sonrasındaki kısa ölçümler: yaklaşık 60–60 FPS.

Bu değerler bu bilgisayardaki kısa ölçümlerdir. Bölüm yüklemesindeki shader hazırlığı ve çizim önbellekleri ilk kullanım maliyetini azaltır; bütün donanımlarda kesintisiz çalışma iddiası yoktur.

Önceki tur yapılan CPU profilinde viewmodel çizimi temel darboğazdı. Cache/copy/warmup adayı 141 görüntü ve tampon eşitliği karşılaştırmasını geçse de dört gerçek animasyon döngüsü A/B koşusunda tutarlı hız kazancı vermediği için teslim sürümüne alınmadı. Deney sonuçları `.dream-loop/performance-experiments/README.txt` ve `provenance.json` içindedir; bu deney yayınlanmış oyunun hızlandığına kanıt sayılmaz. Akıcılık sorunu çözülmüş değildir.

Silah görsel çalışmasında 76 sabit poz renderı ve diğer sekiz silahın 16 pozuyla dört tekme/drop kick pozu, son kovan düzeltmesinden önce denetlendi. Dar kovan düzeltmesi sonrası dört çıkarma/hizalama pozu ve diğer silahların 16 pozu tekrar kontrol edildi. Son viewmodel kaynağı 2c35882398c52876b003a20f98486a4be485327d8121829dce882bcc3952c071; nihai teslimde ayrıca gerçek doldurma ve sesli video kaydı çalıştırıldı. Bu görüntü incelemesi belirli referansla birebir eşleşme iddiası değildir.

## Görsel kanıt ve yeniden çalıştırma

[Giriş](prologue.png), [şapel](chapel.png), [altar kompozisyonu](chapel-altar.png), [kript](crypt.png), [köprü](bridge.png), [arena](arena.png), [çıkış yönündeki dönüş](ascent.png), [bot tabanı](boot-sole.png), [manastır mezar hücresi](monastery-crypt.png), [zindan galerisi](dungeon-gallery.png), [drop kick](dropkick.png), [bitirici](finisher.png).

`docs/combat-preview.webm` son teslim HTML'sinden alınan VP9 + Opus kaydıdır; iki gerçek doldurma, ateş, idle tutuş ve kısa yakın dövüş gösterir. Ses aynı oturumda gerçek WebAudio çıkışından, ses seviyesi ve effects/ambience karışımı sonrasında kaydedildi. Düşman, mühimmat ve başlangıç konumları QA ile hazırlanmıştır; saldırı ve animasyonlar gerçek döngüdedir. Preroll senkron işareti son videodan tamamen kesildi; video 25 FPS olduğu için hizalama çözünürlüğü 40 ms'dir. Fiziksel ekran/hoparlör gecikmesi ölçülmedi.

`docs/audio/reload-audit.wav`, aynı final örnek ve zamanlamanın native effects yolu üzerinden offline dinleme çıktısıdır. Gerçek RAF kontrolü, olayların faz sınırını izlediğini ve iki doldurmada 7 + 7 olay üretildiğini denetler. Teknik testler öznel ses kalitesi onayı değildir; dinleme dosyası kullanıcı incelemesi için bırakıldı.

```sh
npm ci
npm run build
npm test
npm run test:enemies
npm run test:walls
npm run test:visual
npm run test:levels
npm run test:audio
node tools/reload-audio-raf-tests.cjs
npm run test:compatibility
npm run test:navigation
npm run test:smoke
```

Testler kurulu Google Chrome kullanır. Ayrıntılı yerel raporlar `.dream-loop/` altındadır. Navigation ve wall testleri varsayılan olarak teslim HTML'sini okur; özellik kaynaklarını yeniden derlemez.

Sonraki iki bölümün görüntüleri inceleme için konumlandırılmış kameralardır; bu kontrol tam bölüm oynanışı veya zorluk dengesi testi değildir. Test aracı, son teslim HTML içindeki özgün üreticileri ve eklenmiş sürümleri karşılaştırır; güncel kaynakları yeniden enjekte etmez.
