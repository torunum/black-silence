# Doğrulama — 2 Kasım 2026, Blood turu

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
