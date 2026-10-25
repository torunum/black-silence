# Doğrulama — 25 Ekim 2026, Soul tutuşu ve bölüm atmosferi

Teslim dosyası: `THE-BLACK-SILENCE.html`, **22.653.664 bayt**. SHA256: `38b1a9aa2933d1523ba2607f3ae39d6d977b926b4d483d031112e085eb078b95`.

Bu tur Soul Reaper'ın sağ kabza temasını, şapel altarının taş kemerini ve crypt içindeki üç mevcut ışığın dengesini geliştirir. Native düşman pain/attack karelerinin ilk üretimi de mevcut cache kullanılarak bölüm yüklenmesine taşınır. Yeni silah modeli veya genel FPS artışı iddiası yoktur.

## Kaynak ve derleme

Standart builder tüm gömülü modülleri kaynaklarıyla eşleştirir. Native motor SHA256 `6dd6c59430c843ef82b065bde2eba13fab8ce9d166876ba2877e6e90882e7899` ve Village SHA256 `d60bd40de6b093eadcfb9e3f99d822c0987250813647484bef79b73c96a0d627` korunur. Önceki teslimat `b823d85f6dd70b4eb795c4e17cde96cc455b3f11e1c44856a70e78444b9f2103` idi. Son modül/rapor hashleri [build bilgisinde](build-info.json) bulunur.

## Silah ve oyun akışı

Son birleşik 38b1a9aa dosyasında on silahın gerçek R/ateş/geçiş/tekme ve cache kontrolleri geçti. Derleme bütün modülleri eşleştirdi; iki tekrar aynı çıktıyı verdi ve sekiz geçersiz girdi yazmadan reddedildi.

Soul-only `eee23be9…` adayında 660 deterministik çizim karşılaştırmasının 600'ü eşit, yalnız Soul7'nin 60 pozu amaçlı farklıydı; beklenmeyen fark yoktu. Diğer dokuz silah, botlar ve bitiriciler eşit kaldı. Üç ekran oranında gerçek idle/ateş/R doldurma ve cephane bitişi geçti. Kaynakta yalnız sabit sağ el ankrajı değişir; sol el, core/claw hareketleri, cephane, ses ve zamanlama korunur. Bu ara aday karşılaştırması son birleşik dosyada yeniden koşulmuş gibi sunulmaz. [Soul temas kanıtları](soul-grip-oct25b.md).

## Bölüm

Şapel kemeri 17 statik primitive ekler ve iki mevcut ayağı genişletir. Mevcut üç materyal batch'i kullanılır. Üç eş kamerada draw call sayıları 62/92/69 olarak aynı, üçgen farkı +204'tür. Cam/pencere/leadwork, map/collision/route/entity/item verileri korunur.

Crypt değişimi yalnız üç mevcut ışığın şiddeti/menzilidir. Dört native kamera karşılaştırmasında çizim/doku/materyal sayıları eşit kaldı. Son `a887a17a…` prologue kaynağının tüm harita testi yalnız bu üç ışık farkını kabul eder; diğer map verileri eşittir. `e2d734d2…` çevre adayında 15 native yürüyüş noktası, ilk canlı encounter, eşya alımı, E çıkış ve sonraki bölüme varış geçti. İlk encounter sonrasındaki rota testi tam savaş dengesi ölçümü değildir.

Altar-only `911050d9…` adayındaki beş gerçek bölüm geçişinde scoped dokuların 9/9'u temizlendi; sonraki bölümde ilgili etiket ve temizlenmiş doku yeniden kullanımı sıfırdı. Dönüşte resident texture sayısı 49 olarak sabitti. Son çevre sürümüne bundan sonra yalnız üç ışık parametresi değişimi eklenmiştir. Final 38b birleşik dosyasında aynı beş geçiş ayrıca geçti: 9/9 disposal, 0 next-level tag ve 0 disposed reuse. Renderer resident49 sabit kalmıştır; bu sayı global rig cache içindeki CPU bitmap toplamı değildir. [Eşleşmiş görüntüler, kaynak ömrü ve kapsam](chapel-architecture-oct25b.md).

## İlk temas ve sınırlar

Final 38b dosyasında native ilk/tekrar temas, yükleme/bölüm dönüşü, gerçek ateş-cephane/HP akışı, oyun RNG/state korunumu ve beş pain/attack PNG hashinin baseline ile eşitliği geçti. Kontrollü önce/sonra ölçümde ilk temastaki beş pose bake kaldırıldı; iş bölüm yüklemesine taşınır. Prologue için yaklaşık 217 KiB raw RGBA ek cache ve ölçülen 36.6 ms yükleme işi vardır; bunlar tek yerel ölçümdür, GPU/driver/canvas ek yükünü içermez. Cache globaldir ve map-owned dokular gibi temizlenmez. [Ayrıntılı ölçüm, bellek ve test kapsamı](enemy-pose-warmup-oct25.md).

Performans sonuçları ilgili cihaz/sahne ve test girdileriyle sınırlıdır. Silahlar gerçek hacim ve hareketli parçalara bağlı perspektifli resim yüzeyleri kullanır; tam serbest açılı 3B model değildir. Önceki animasyon, bitirici ve materyal kanıtları kendi tarihli sürümlerine aittir. Bu tur bütün kampanyanın hatasız olduğu iddia edilmez.

## Paket

`dist/THE-BLACK-SILENCE-2026-10-25-ATMOSPHERE.zip`, yalnız Git'te takipli veya açıkça stage edilmiş izinli kaynak/asset/doc/tool dosyalarını içerir. HTML, kaynak modüller, build-info ve her ZIP girdisi çalışma dosyalarının hashleriyle eşleştirilir. Ignored log, untracked deneme, `.dream-loop`, bağımlılıklar ve Git metadatası dahil edilmez. Paketleyici küçük ayrı Git fixture'ında ignored/untracked dışlama ve mevcut ZIP'i değiştirmeme testinden geçti. Önceki paketler korunur.
