# Doğrulama — 14 Kasım 2026

## Zindan teslimi

Yeni tek dosya 18.945.949 bayt. SHA-256 `fd809a3a410f390e21e9b2e4cc7ebfe2606ba8c346c2bb899062d91fc83a8d6e`. Art arda iki derleme aynı dosyayı verdi. Gerçek eski zindan kaydında keşfedilmiş 219 hücrenin 216'sı yeni plana taşındı. Yeniden şekillenen üç duvar hücresi tekrar ziyaret edilene kadar gizli kaldı. Bir sonraki kayıt ve Continue açılmış parmaklığı, tek sır puanını ve cephaneyi geri getirdi. [Kayıt aktarımı](gaol-sally-port-nov14/campaign-upgrade.json) · [Zindan ve port](gaol-sally-port-nov14/README.md) · [Harita ve pusula](wayfinding-nov14/README.md).

## Önceki Parish teslimi

Teslim edilen tek HTML dosyası 18.551.365 bayt. SHA-256 `8d31559d3d5540c5070ac7325e6c973a41e8402d402e09f5f8012712f1088ec7`. İki bağımsız yeniden derleme aynı dosyayı üretti. Sekiz hasarlı derleme girdisi dosya değişmeden reddedildi. [Son sürümün ölçümleri](verification-data/nov14-parish-release.json) · [Modül ve kanıt hashleri](build-info.json).

Son dosyada Chrome on bir bölümü yükledi. Ayrı bir dizinde tek dosyayı çevrimdışı açıp ana menüden New Game ile oynadık. Silah 6/60 iken ateş 5/60, ardından R 6/59 gösterdi. Ses çıkışı ölçüldü. Haricî ağ isteği ve oyun hatası kaydedilmedi. HUD 27 örnek durumda sınandı ve iki karşılaştırma görüntüsünün pikselleri eşleşti. [HUD ölçümleri](hud-nov14/README.md).

Prologue rota testi 15 durağı ve sonraki bölümü kapsıyor. İlk karşılaşmada düşman yapay zekâsı çalışıyor; sonraki duraklarda yürüyüş, duvarlar, yükseklikler ve çıkış etkileşimi sınanıyor. Yerel kampanya testi gerçek E, Tab, M, sayfa yenileme ve ölüm sonrası shrine dönüşlerini kullanıyor. [Prologue](prologue-vitray-nov14.md) · [Kampanya test senaryoları](campaign-nov14/automap-verification.json).

Fabrika saldırısı, Guardian mermileri, yeni manastır geçidi, kanalizasyon vanası ve ayak sesleri oyun içinde ölçüldü. Cross, Soul, Tommy ve Sniper kanıtlarında aynı kamera ve doldurma evreleri karşılaştırıldı. [Fabrika](factory-nov14/README.md) · [Guardian](guardian-nov14/README.md) · [Manastır](monastery-nov14.md) · [Kanalizasyon](sewer-works-nov14.md) · [Cross ve Soul](relics-nov14/README.md) · [Tommy](tommy-nov14/README.md) · [Sniper](sniper-nov14/README.md).

Yerel dağıtım dosyası `dist/THE-BLACK-SILENCE-2026-11-14-PARISH.zip`. GitHub üzerindeki kaynak arşivi açıkça main dalını kullanır. [Oyunu indir](https://github.com/torunum/black-silence/raw/refs/heads/main/THE-BLACK-SILENCE.html) · [Kaynak arşivini indir](https://github.com/torunum/black-silence/archive/refs/heads/main.zip).

Kanalizasyonda oyuncu, pompa kaidesinin iki tarafından Shift ile koşup sağ fareyle zombiye drop kick attı. Zombi darbe alıp yere indi ve oyuncuyu yeniden takip etti. Çarpma noktasından iki denemede 4,48 ve 2,76 metre ilerledi. [Kaide ve duvar denemeleri](sewer-works-nov14/kick.json). Aynı yapıda on silahın ateş, doldurma, geçiş, tekme, önbellek ve 89 ses kontrolü geçti. [On iki kampanya senaryosu ve bütünleşik sonuçlar](verification-data/nov14-parish-release.json).

## 13 Kasım 2026

**13 Kasım sürümü:** 18.002.486 bayt, SHA-256 `31a05e9b68138b7f8c3aaa83a923175db8507b81ba07e2dbf6338ba395f7604c`. [Birleşik doğrulama](verification-data/nov13-vigil-release.json) ve [modül hashleri](build-info.json).

Çanın gerçek E etkileşimi yalnız bir keşif saydı; kapak açılınca geçiş mümkün oldu, arka duvar kapalı kaldı. Ödül toplam altı fişek. Alınmış ve alınmamış durumlarda ayrı ölüm/kayıt dönüşleri ödülü çoğaltmadı. Kontrollü bir denemede diğer sonuçlar aynıyken sır keşfi bölüm notunu B'den A'ya çıkardı. [Çan testi ve ses ölçümü](vigil-nov13/verification.json).

Teslim edilen dosyada on silahın gerçek ateş/doldurma/değiştirme/tekme ve önbellek kontrolleri, prologue'un 15 kontrol noktası ve bölüm geçişi, bölüm rekorları, ana düşman sonrası son ekran ve 35 savaş kontrolü geçti. [Nail Cannon karşılaştırması](nail-cannon-nov13/README.md) ayrı silah çalışmasında alınan görüntülerin kaynağını belirtir.

## 13 Kasım: ilk teslim

GitHub `main` üzerindeki `d4ec5d6` sürümü fast-forward ile kontrol edilip temel alındı. [İlk teslimin sonuçları](verification-data/nov13-release.json) aşağıdaki testlerin aynı 17.992.630 baytlık oyun dosyasını kullandığını kaydeder. Yeniden derleme aynı çıktıyı verdi; özgün motor ve Village aynı.

- Dönüş şapeli ve merdiven, 11.102 çarpışma örneği, zindanda gizli kapıdan sağlık paketine geçiş (50 → 75 HP), prologue'da 15 kontrol noktası ve sonraki bölüm.
- Dört gerçek R girişi senaryosunda çiftenin görünen fişekleri, ekleme ve iptal. On silahla ateş, doldurma, değiştirme, tekme ve görüntü önbelleği.
- Olağan zombi için 14 ses ve yaşam döngüsü testi, 39 düşman poz kontrolü. Çok sayıda test penceresi açıkken ilk ses testi izin gerektiren bir pointer-lock hatası bildirdi; aynı dosya ve test tek başına hatasız geçti.
- 360 × 480 ekranda CRT ayarı ve klavye kullanımı, kayıt alanı kapalıyken geçici ayar, dosya tekrar açıldığında normal kayıt; gerçek bölüm çıkışı ve son düşman sonrası rekor ekranı. [Rekor testi](chapter-records-nov13.md).

[Harita](return-chapel-nov13.md) ve [silah](arsenal-nov13/README.md) notlarında karşılaştırma görüntüleri hangi özel deneme sürümünden alındıysa o sürüm belirtilir. Zombi örnek sesleri tek başına çevrimdışı hazırlanmıştır. Genel FPS artışı ölçülmedi.

## Arşiv — 2 Kasım 2026, Blood turu

Son teslim HTML: **24.914.672 bayt**, SHA-256 `5e5ceb0cb354945067ef71cfa5600fd9836a4236cf20258aff548bea3ec1a3cc`. GitHub main başlangıcı `567328539d2719f8a23a5951ef89553b5836484b`; fetch ve fast-forward kontrolünde günceldi. Eski ayrı geliştirme dalı karıştırılmadı.

## Harita ve Blood incelemesi

Resmî Blood: Fresh Supply görsellerindeki malzeme ayrımı, mimari eşikler ve okunaklı mekanik siluetler incelendi. Blood oyun assetleri kopyalanmadı; kısa fragman gözlemi eksiksiz reload zamanlaması kanıtı olarak kullanılmadı. [Kaynaklı inceleme](blood-reference-study-nov02.md).

Kript döşemesi, niş çeşitliliği ve üç taş tavan kaburgası; cehennem genel taş döşemesi ve ateş çevresindeki aşınmış ritüel taşları geliştirildi. Son ek yalnız prologue kemiklerinin malzemesini değiştirir. Büyük kaymış tabut kapağı denemesi reddedilip önceki V6 tabut geometrisi aynen korundu. [Gerçek görüntüler, ayrı değerlendirmeler ve sınırlar](blood-prologue-nov02.md).

Tam harita tanımı dört statik dekor, iki tabut ayrıntı bayrağı, mevcut kemiklere malzeme bayrağı ve kript zemin malzemesi dışında aynı. Oynanış yüksekliği, düşman, eşya, ışık ve çıkış tanımları korunur. Son kemik kontrolünde beş işaretsiz builder aynı; 71 işaretli parçada sadece malzeme değişir. Son kaynakla beş kaynak yaşam döngüsü ve 11 görünüm geçti: 60 texture handle, 49 image, 238 material. Önceki V6 kaynakta ölçülen kaburga açıklığı ve performans raporları kendi eski hashleriyle saklanır; final birleşik sonuçları ayrı raporlanır.

## Silah ve cephane

Bu tur Sniper ve Stake modelleri/tutuşu/doldurma sunumu değişti. Shotgun görsel denemeleri tekrarlanan performans kaybı nedeniyle reddedildi; önceki çizimi korundu. Handgun ve önceki Rifle/Tommy korunur. Silah adayının görsel/aspect/parite kanıtları ile final birleşik gerçek oynanış testleri ayrı girdiler taşır; rapor hashleri hangi dosyanın sınandığını gösterir. Fresh bağımsız inceleme sınırlı değerlendirmesini açıkça belirtir; bütün silahlar referansla aynı kalitede ilan edilmez.

Shotgun iki gerçek haznesine uygun iki fişek taşır. Kontrol noktası yüklemesinde fazlalık yedeğe aktarılır, cephane silinmez; tekrar yükleme fazladan cephane üretmez. İlk alım toplam dokuz fişek, dolu silah tekrar alımı beş yedek fişek verir. Boş/kısmi silahın ücretsiz tamamlaması iki gerçek hazneyle sınırlıdır. [Tam davranış ve gerçek giriş testleri](shotgun-capacity-nov02.md). Hasar, saçma sayısı ve reload süresi değişmez.

Final birleşik üzerinde on silahın gerçek R doldurması, ateşi, değiştirme/tekme/ateş iptali ve çizim cache kontrolleri; Shotgun gerçek ilk alımı, iki atış, otomatik/tek yedekli doldurma ve iptal/cephane korunumu; prologue native rota/çıkış/dönüş testleri ayrı raporlarda kayıtlıdır. Bu testler tüm kampanyanın bitirilmesi veya tüm savaş dengesinin onayı değildir.

## Derleme, ölçüm ve paket

Özgün motor, Village ve değişmeyen modül hashleri korundu. İki ardışık derleme byte-identical; sekiz bozuk marker girdisi yazmadan reddedildi. [Build ve bütün rapor hashleri](build-info.json).

Performans raporları gözlemlenen cihazda kısa seri ölçümlerdir. Silah toplam frame ve duraklatılmış harita render CPU ölçümleri farklı kapsam taşır; genel FPS kazancı, GPU tamamlanma süresi veya başka cihaz garantisi olarak sunulmaz. Final harita ABBA raporu final birleşik girdiyi açıkça kaydeder.

Paket `dist/THE-BLACK-SILENCE-2026-11-02-BLOOD-PASS.zip` yalnız açıkça stage edilmiş/takipli izinli kaynak, asset, doc ve tool dosyalarından hazırlanır. Her ZIP girdisi SHA-256 ve tam manifest ile denetlenir. Özel adaylar, bağımlılıklar, cache ve Git metadatası pakete girmez; önceki ZIP'ler korunur.
