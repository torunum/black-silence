# Doğrulama — Arsenal / Hell

Dosya: `THE-BLACK-SILENCE.html`, **22.632.339 bayt**. SHA256: `5c071b1892db41b162542460dc447586c4919df3d730bcf07164dea9dfe1e932`.

On silahın model/tutuş görünümü ve hareketli doldurma parçaları ile yeni prologue cehennem ayrıntıları tek dosyada birleştirildi. Oyun istatistikleri ve özgün motor korunur. Village sunumu kullanıcı devir paketindekiyle birebir aynıdır.

## Test kapsamı

| Kontrol | Kanıt ve kapsam |
| --- | --- |
| Derleme | Kaynak modüller gömülü metinlerle birebir; art arda iki build aynı dosya. Sekiz bozuk marker girdisi yazılmadan reddedilir. Motor ve Village hashleri korunur. |
| Görsel entegrasyon | On silahın idle/insert pozları ile bot/drop kick/bitiricilerden toplam 33 ham piksel karşılaştırması birebir. Bu, diğer silahların eski teslimattaki haliyle aynı olduğu anlamına gelmez; onaylanan yeni ayrı modellerin birleşimde korunduğunu doğrular. |
| Çizim optimizasyonu | Üçgen/satır sabitlerini dışarı alan değişiklik; 116 opak/yarı şeffaf, derinlik örtüşmesi, silah/poz/geçiş ve yakın dövüş durumu için hem ham RGBA hem canvas çıktısında birebir eşit. Bu test son Cross yüzey düzeltmesinden önceki ortak adayda çalıştı; son entegrasyon ayrıca yukarıdaki 33 pozla doğrulandı. |
| Silahlar | Gerçek R/RAF akışıyla on silahın doldurma, ateş, cephane, silah değiştirme, iptal, tekme ve kalıntı temizleme kontrolleri. |
| Cehennem bölümü | 15 navigasyon noktası, gerçek E çıkışı, başka bölümde dekor temizliği ve cehenneme iki dönüş. Cehennem arenasında on silahın 20 idle/insert pozu görünür ve sonlu. |
| Çevrimdışı / kayıt | Normal `file://` açılışı, kayıt uyumluluğu ve ayarlar. Görseller HTML içine gömülüdür. |
| Ses | İlk iki silah için 42 ses kontrolü ve gerçek R/RAF ses zamanlaması. Bu kayıt tabanlı ses kapsamı tüm on silah için yeni ses kaydı yapıldığı anlamına gelmez. |

Final dosyanın raporları `verification-data/arsenal-final-5c071b18-*.json` adıyla tutulur. `arsenal-milestone-650ecdc7-*` ara sürüm ölçümüdür; final sonuç olarak kullanılmaz. Önceki teslimatın kökteki eski test raporları bu tur yeniden koşulmuş gibi sunulmaz. Testler tam kampanya oynanışı değildir.

## Görsel yöntem ve ölçüm sınırları

Yeni silahların çoğu, gerçek hacimli arka/yan yüzeylere ve hareketli mekanizmalara bağlı perspektifli resim yüzeyleri kullanır. Eller ayrı derinlik sınamasıyla çizilir. Bu yöntem tam serbest açılı 3B model değildir; resimlerin bazı ışık ve perspektif bilgileri sabittir. Cehennem mimarisinde bazı ışık vurguları da statiktir.

Sabit üçgen hesaplarını piksel döngüsünün dışına taşımak görüntüyü değiştirmeden compositor maliyetini azaltmıştır. Yerel seri ABBA ölçümünde başlangıç turu ısınma/değişken işlemci hızından etkilenmiştir; tek sayıdan genel FPS garantisi çıkarılmaz. Son çalışma zamanı ölçümünün ham sonuçları ayrıca kaydedilir. Daha ayrıntılı modellerin maliyeti sahne ve silaha göre değişir.

Son seri ABBA, önceki `3807e06b` teslimatı ile bu dosyayı aynı bilgisayarda ve bölüm 0 başlangıç kamerasında karşılaştırdı. Aşağıdaki değerler doldurma sırasında havuzlanmış sonuçlardır; cehennem arenasının veya bütün kampanyanın ölçümü değildir.

| Silah | Silah çizim CPU, önce → yeni | Gerçek RAF FPS, önce → yeni |
| --- | --- | --- |
| Çift namlulu | 14,56 → 15,76 ms | 51,18 → 51,45 |
| Nail | 15,53 → 10,69 ms | 46,81 → 55,91 |
| Soul | 8,71 → 16,16 ms | 55,67 → 49,78 |
| TNT | 12,10 → 11,45 ms | 52,42 → 55,93 |
| Stake | 11,62 → 11,06 ms | 52,72 → 53,49 |

Soul'un yeni kavisli yüzeyi belirgin ek çizim maliyeti taşır: ölçülen p95 kare süresi 18,2 ms'den 36 ms'ye çıktı. Görsel ayrıntı korunmuştur; bu silahta akıcılık sorununun tamamen çözüldüğü iddia edilmez. Ham ABBA turları ve özet `arsenal-final-5c071b18-performance*.json` içindedir.

Güncel gerçek oyun medya kayıtları `previews/` içinde kaynak HTML hashleriyle listelenir. Tasarım hedefleri `assets/` içinde ayrı tutulur. Eski `docs/` kök görselleri bu sürümün kanıtı değildir.

[Doldurma videosu](previews/arsenal-reload.webm) doğrudan son ana HTML'den 6,888 saniye gerçek RAF/klavye R ve oyun WebAudio çıkışı kaydeder. QA yalnız ikinci silahı ve cephaneyi verir; poz sabitlemesi kullanılmaz. Video 25 FPS, ses eşleme hassasiyeti bir kare (40 ms); fiziksel hoparlör gecikmesi ölçülmez. Nail idle görseli kontrollü pozla, cehennem arenası görseli navigasyon kamerasıyla çekilmiştir; bu ayrım `previews/provenance.json` içinde açıkça belirtilir.
