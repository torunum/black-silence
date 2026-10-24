# Çizim maliyeti — 24 Ekim 2026

Seçilen değişiklik `src/viewmodels.js` SHA256 `47e65ce26a3f7d642ddcdd9d4cf59747d1e533c87a34aa7a7517db1f4914a236` içindedir. Onaylanan silah/el görünümü, çözünürlük, geometri sayısı, animasyon zamanlaması ve ışık hesapları korunur.

Üçgenin dikdörtgen sınırında olup üçgenin dışında kalan pikseller, muhafazakâr satır sınırlarıyla atlanır. İki piksellik pay ve özgün barycentric/epsilon sınaması korunur. Soul/TNT/Stake için ortak `r79Rig` yardımcısının sabit yerel yüzey, UV, normal ve trigonometrik sonuçları yeniden kullanılır; güncel parça dönüşümü ve aydınlatma her çizimde hesaplanır.

## Doğrulama

- Son birleşik `41f96467` ile önceki teslimat `5c071b18`: 594 silah/animasyon/geçiş/yakın dövüş durumu için ham RGBA ve canvas pikselleri birebir; sıfır sayfa hatası.
- 1.800 belirlenimci compositor vakası: dejenere ve ince üçgen, ekran dışı sınır, UV taşması, opak/yarı şeffaf kenar ve derinlik örtüşmesinde pikseller ve çizim sınırları birebir.
- Seçilen kaynak için bağımsız salt okunur inceleme: cache girdilerinin değiştirilmemesi, anahtarların yeterliliği ve satır sınırı işaretleri kontrol edildi.

Kanıtlar `verification-data/renderer-20261024-{final-parity,kernel,provenance}.json` içindedir. Önceki 356 pozluk renderer-only raporu da tarihsel olarak korunur; son 594 pozun yerine kullanılmaz.

## Soul karşılaştırması ve seçim

Aynı bölüm 0 başlangıç kamerasında, eşit ısınma sonrasında üç aday dengeli A/B/C/C/B/A sırasıyla gerçek R ve RAF üzerinden ölçüldü. Her oturumda ilk doldurma ayrı, sonraki üç doldurma sıcak tur olarak kaydedildi. Bütün turlar korunur.

| Aday | Sıcak doldurma çizim CPU | Sıcak RAF FPS | Sıcak kare p95 | İlk doldurma FPS |
| --- | ---: | ---: | ---: | ---: |
| Önceki teslimat `5c071b18` | 14,61 ms | 54,24 | 18,2 ms | 53,37 |
| Seçilen satır sınırı + sabit geometri | 13,68 ms | 55,61 | 18,2 ms | 55,46 |
| Seçilmeyen ek native primitive cache | 12,97 ms | 55,42 | 18,2 ms | 53,76 |

Ek primitive cache CPU ortalamasını düşürse de ilk doldurma ve genel kare akışında daha iyi sonuç vermedi. Daha basit ikinci aday seçildi. Uint32 piksel kopyası ve erken native yüz eleme denemeleri de teslim kaynaklarına alınmadı. Bu, ölçülü bir iyileşmedir; Soul akıcılığının her durumda çözüldüğü iddia edilmez. Son birleşik dosyanın beş silahlı ABBA ölçümü ayrıca final doğrulama raporunda yer alır.

Ham dengeli kayıtlar `renderer-20261024-soul-balanced-raw.json`, özetleri `renderer-20261024-soul-balanced-summary.json` dosyalarındadır. Ölçümler tek bilgisayarın headless Chrome oturumudur; tüm kampanya veya farklı donanım için FPS garantisi değildir.

Raporlar değişmeyen giriş HTML'lerinin ve ayrı test fixture'larının hashlerini içerir. Geçersiz fixture ile çalışmış ara deneyler karar ve sonuç tablolarından çıkarılmıştır.
