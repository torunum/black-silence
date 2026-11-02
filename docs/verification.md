# Doğrulama — 2 Kasım 2026

Son teslim HTML: **24.901.782 bayt**, SHA-256 `3d58959919c4b673aa7643dd1237ecaf98eb21654f89f87a5b007f7d745a69e9`. GitHub main başlangıcı `247b824` günceldi; fetch ve fast-forward kontrolü yapıldı. Daha eski ayrı geliştirme dalı ana oyuna karıştırılmadı.

## Harita ve DreamLoop

Cehennem köprüsünün taş yüzeyi ve kakmaları, lav çıkışlarının mimarisi ve sivri tonoz profilleri geliştirildi. Bağımsız görsel değerlendirme 6,3 → 6,7 → 7,3 → 7,7 ilerledi; hedefle piksel eşitliği iddiası yoktur. Arena zemini yeniden yapılmadı. [Görüntüler ve kapsam](hell-causeway-nov02.md).

Haritanın bütün oynanış/dekor/ışık/zemin tanımları aynı. Native 15 kontrol noktası, ilk canlı karşılaşma, isteğe bağlı Shotgun alımı, E çıkışı, sonraki bölüm ve dönüş geçti. Beş harita döngüsünde kaynak temizliği ve tarayıcı hatasızlığı doğrulandı. Eğri açıklığı 1.001 örnekte daralmadı. Bu test tüm oyunun bitirilmesi değildir.

Altı eş kamerada draw call aynı, gönderilen üçgen +18.492. Seri ABBA ölçümünde köprü ortalaması 56,275 → 56,211 FPS; arena 56,157 → 55,917 FPS; frame p95 18,1–18,2 ms. Ek geometri küçük bir CPU maliyeti taşır. Bunlar kısa, duraklatılmış sahne ölçümleridir; genel FPS kazancı veya cihaz garantisi değildir.

## Silahlar

Altı silah değişti: 1,2,3,4,7,9. Handgun/Cross/Nail/Dynamite, bot ve bitirici çizimi korundu. Rifle/Tommy referans el siluetleri ve açık tetik korkulukları kullanır. İlk Rifle adayındaki doldurma sırasında ayrık görünen ahşap/metal parçalar bağımsız incelemede yakalanıp çıkarıldı. Son özel silah adayı `2fa1bf12…`, final birleşikle aynı `25c82ff3…` viewmodels kaynağını içerir. [Silah raporu](weapons-dreamloop-nov02.md).

Son silah adayı üzerinde üç en-boy oranında 135 native kare ve 27 doldurma sonu geçti. 660 deterministik çizim karşılaştırması: 300 aynı, 360 yalnız değişen altı silah için beklenen fark, beklenmeyen fark sıfır. Bu karşılaştırma kalite puanı değildir. Fresh bağımsız inceleme Rifle/Tommy tutuşlarını ayrıca değerlendirdi; bütün silahlara aynı puan verilmiş gibi sunulmaz.

Final birleşik `3d58959919c4b673aa7643dd1237ecaf98eb21654f89f87a5b007f7d745a69e9` üzerinde on silah gerçek R doldurma/cephane korunumu, ateş, silah değiştirme, tekme ile iptal/toparlanma, kısmi dolu şarjörle ateş iptali ve çizim cache kontrollerinden geçti. Sayfa hatası ve ağ isteği sıfır. Görsel/aspect incelemesi özel silah adayındadır; final birleşik üzerinde yeniden 135 kare koşulduğu iddia edilmez.

## Derleme ve paket

Özgün motor, Village ve değişmeyen modüllerin hashleri korundu. İki ardışık derleme byte-identical; sekiz hatalı marker girdisi dosyaya yazmadan reddedildi. Final kaynak ve rapor hashleri [build bilgisinde](build-info.json). Önceki ses/combat düzeltmeleri bu tur yeniden yapılmış veya yeniden test edilmiş gibi sunulmaz.

Paket `dist/THE-BLACK-SILENCE-2026-11-02-DREAMLOOP.zip`, açıkça stage edilmiş/takipli izinli kaynak, asset, doc ve tool dosyalarından üretilir. Her ZIP girdisi ve manifest hashleri ayrıca doğrulanır. Özel adaylar, cache, bağımlılıklar ve Git metadatası pakete girmez; eski ZIP'ler korunur.
