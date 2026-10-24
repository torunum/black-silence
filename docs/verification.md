# Doğrulama — 24 Ekim 2026, ortam ve son rötuşlar

Teslim dosyası: `THE-BLACK-SILENCE.html`, **22.647.573 bayt**. SHA256: `d5a41a6872cb7b58f0e7f4b95c58e55d466f520070a64adfa2cf66cc1df564df`.

Bu sürümün ortam değişiklikleri iki ritüel direğinin kemik/bazalt malzemeleri ve mevcut beş lav akışındaki küçük yatay doku değişimiyle sınırlıdır. Rota, geometri, ışıklar, düşmanlar ve alımlar korunur. Ayrıca Rifle doldururken şarjör ve sol elin ekranın altına kaybolması, ortak hareket zarfı ve daha kısa çıkarma yolu ile düzeltildi.

## Derleme ve kaynak sınırları

Standart derlemenin iki tekrarı aynı HTML'yi üretti; sekiz bozuk marker girdisi yazılmadan reddedildi. Motor SHA256 `6dd6c59430c843ef82b065bde2eba13fab8ce9d166876ba2877e6e90882e7899` ve Village SHA256 `d60bd40de6b093eadcfb9e3f99d822c0987250813647484bef79b73c96a0d627` korunur. Modül ve rapor hashleri [build bilgisinde](build-info.json) bulunur. Önceki teslimat `9cecdb74a11b616d9bfe12c031f2ff1c3e543f103cbc21dba6f280fdecd0e1f9` idi.

## Ortam doğrulaması

- İki ritüel direğinin boyutları ve dönüşümleri aynıdır. Yeni 32×64 kemik dokusu yalnız bu iki nesnede paylaşılır; kaideler mevcut bazaltı kullanır. Global bone/oldbone malzemeleri, kırmızı kumaş ve yakındaki zırh alımı değişmez.
- Bütün üretilen harita, yükseklikler, dekor, ışıklar, karşılaşmalar ve alımlar eski kaynakla eşleşir. Beş bölüm ayrılış/dönüşünde sekiz kapsamlı texture serbest bırakılır; kullanılmış texture yeniden kullanılmaz ve sonraki bölümde özel malzeme kalmaz. Bir texture ve bir materyal/geometri grubu eklenir; ölçülen üç kamerada draw sayısı değişmez. Bu bir FPS kazancı iddiası değildir.
- Lavlarda maksimum U farkı 0,03939'dur. Verteksler, V koordinatları, tekrar oranları ve aynı fazdaki native kaydırma değerleri birebir eşleşir. Üç kontrollü fazın yanında gerçek RAF sırasında zaman ve kaydırmanın ilerlediği doğrulandı. Sonraki bölüm ve geri dönüş UV kontrolü geçti; yeni çizim kaynağı eklenmez.

[Materyal/akış kanıtları ve tekrar çalıştırma komutları](ritual-ivory-oct24c.md) test girdilerini açıkça etiketler. Arena resimleri yalnız materyal adayını, akış çifti yalnız UV değişikliğini gösterir; son birleşik sürüm diye yeniden etiketlenmez. Kameralar native göz yüksekliği ve zone/fog/ambient ayarlarını kullanır. Kontrollü faz resimleri gerçek zamanlı video değildir.

## Silah, ses ve işlevsel kapsam

Son d5a41a68 dosyasında on silahın gerçek R/RAF doldurması, cephane aktarımı, ateş, geçiş, tekme/iptal ve çizim kalıntısı kontrolleri geçti; sayfa hatası yok. Rifle için üç ekran oranında altışar native faz ve şarjörün dolması doğrulandı. 660 görüntü karşılaştırmasında 610 eşitlik, yalnız Rifle doldurma pozlarında 50 amaçlı fark vardı; beklenmeyen fark yok. [Rifle düzeltmesi, gerçek oyun videosu ve raporlar](rifle-reload-oct24c.md).

Önceki Sniper/Soul temas ve enerji hareketleri, geniş ekrandaki kol devamı, yaşayan düşman inişi ve native ölümde doldurma sesini durdurma davranışı korunur. Bu tur düşman koduna yeni bir düzeltme yapılmadı. Hasar, cephane, doldurma süreleri, sağlıklar, stagger olasılığı ve çarpışmalar değişmez. [Önceki animasyon kanıtı](weapon-animation-oct24b.md), [iniş davranışı](enemy-landing-oct24.md) ve [ses yaşam döngüsü](audio-lifecycle-2026-10-24.md) kendi tarihli girdilerine aittir.

## Ölçüm ve görsel sınırlar

Bu tur denenmiş renderer hızlandırmaları tutarlı gerçek doldurma kazancı göstermediği için teslimata alınmadı. Compositor test aracı güncellendi: 3600 ana/kenar tamponu RGBA, canvas, depth ve bounds karşılaştırması; input alias korumaları ve kasıtlı hatalı aday kontrolü geçti. [Renderer doğrulaması](renderer-verification-oct24c.md). Bu doğruluk kontrolleri final sürümün FPS ölçümü değildir.

Ayrı kısa Rifle ABBA kontrolünde, aynı bölüm-0 kamerasında ve bu bilgisayarda altışar gerçek doldurma karşılaştırıldı: pooled raster CPU 13,93→11,81 ms, FPS 51,05→54,66, kare p95 35,8→18,2 ms. Bu sınırlı kontrolde gerileme gözlenmedi; tüm silahlar veya cihazlar için kazanç iddiası değildir. [Ham ölçüm özeti](verification-data/rifle-oct24c-performance-summary.json).

Önceki 41f→9cec ABBA ölçümlerinde Sniper/Cross ek çizim maliyeti vardı; [tarihsel ham özet](verification-data/animation-oct24b-performance-summary.json) korunur. Eski ölçümler bu sürümün kazancı olarak sunulmaz. Sabit FPS veya bütün cihazlarda performans iyileşmesi garantisi yoktur.

Silahlar gerçek hacim ve hareketli parçalara bağlı perspektifli resim yüzeyleri kullanır; tam serbest açılı 3B varlık değildir. Bazı yüzey ışıkları resimde sabittir. Testler belirtilen akışları doğrular; tam kampanyanın hatasız olduğu iddia edilmez.

Paket `dist/THE-BLACK-SILENCE-2026-10-24-POLISH.zip` adıyla ayrı oluşturulur. ZIP içindeki HTML ve build-info ana dosyayla eşleştirilir; önceki ZIP'ler değiştirilmez. Özel denemeler, bağımlılıklar ve önbellekler pakete dahil edilmez.
