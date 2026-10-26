# Doğrulama — 26 Ekim 2026

Teslim dosyası `THE-BLACK-SILENCE.html`, **24.886.358 bayt**. SHA256: `56394da38ad2dff02bffb5a32900daa40cf7c6cd319be7e6a1b850145e6e376d`.

Bu tur handgun görünümünü koruyarak diğer silahların referans oranlarını, bazı gövde/bağlantı detaylarını ve doldurma kadrajını geliştirir. Zombinin darbe sesi daha pes iki mevcut kayda yönlendirilir. Cehennemdeki dört büyük kemer daha ağır taşıyıcı kütle kazanır. Bütün silahlar sıfırdan yeniden yapılmış veya genel FPS artmış değildir.

## Son birleşik dosya

Son birleşik adayda on silah için gerçek ateş/R, cephane tamamlama, silah değiştirme/tekme ve render cache akışları geçti. Native prologue rota ve bölüm geçişleri ayrıca doğrulandı. Standart builder bütün modül hashlerini ve native/Village byte bütünlüğünü kontrol eder.

Native motor ve Village sunumu byte düzeyinde korunur. Önceki yayın `4b03db10fcf7433e90e2f21e662224d79ce356f3e2bac392ab7ab21cd09c6198` idi. Son kaynak/rapor hashleri [build bilgisinde](build-info.json) bulunur.

## Silahlar

Native raster/canvas/yan buffer karşılaştırması, yalnız viewmodel değişen `4baca569…` özel adayında 660 poz kapsadı: 120 birebir, 540 beklenen 1–9 silah farkı, beklenmeyen fark 0. Handgun 0 ile bağımsız tekme/bitirici kareleri aynı kaldı. Bu adayın `fac282…` viewmodels kaynağı son birleşik dosyada aynıdır. Oranlar/kadraj ve seçili mekanik detaylar değişti; cephane veya süreler değişmedi. [Güncel görüntüler ve kesin kapsam](arsenal-model-oct26.md).

Görsel çiftler ve ara aday kontrolleri kendi gerçek input hashlerini korur; final birleşik dosyada tekrar koşmuş gibi etiketlenmez. Silahlar hacimsel taşıyıcı ve hareketli parçalara bağlı referans resim yüzeyleri kullanır; her açıdan serbestçe bakılabilen tam 3B asset iddiası yoktur.

## Zombi sesi

Yalnız ordinary zombie `z` darbe/pain olayı iki mevcut pes kaydı kullanır. Native varyasyon/RNG sırası, emitter throttle, spatial/room route, saldırı/ölüm ve diğer ses yolları korunur. Decode öncesinde veya decode başarısızsa native fallback çalışır; başlangıçta iki ek ses buffer'ı yaklaşık 151 KiB kullanır.

İlk `5a455752…` özel adayda 14 native/lifecycle kontrolü geçti; gerçek fare ateşiyle zombi yaralandı/öldü, diğer ses yolları korundu. Offline önce/sonra WAV'lar aynı rate/gain ile ve normalize edilmeden üretildi; bunlar oyun içi kayıt değildir. Aynı 14 kontrol portable araçla son `56394da3…` birleşik adayda yeniden geçti; hata sıfır. [Final ses raporu](verification-data/zombie-audio-oct26-final.json). [Kapsam ve dinleme örnekleri](zombie-audio-oct26.md).

## Cehennem mimarisi

Yalnız `hellGreatArch.build` içinde dört kemer ayağı değişir: kademeli kaide, üçlü taş yüzey ve basamaklı arka payanda. Toplam 142 ek primitive / 2.640 üçgen; altı eş native kamerada çizim çağrıları 68/57/63/72/199/195 ve doku 54 / materyal 234 / renderer geometry 159 sayıları aynı kaldı. Yeni ışık/doku/material/shader yok.

`4d7b584c…` çevre-only adayında tüm map/grid/collision/route/entity/item/light verisi birebir eşit; native 15 rota noktası, ilk canlı karşılaşma, E çıkış/Space devamı ve sonraki bölüme varış geçti. Beş gerçek geçişte scoped 8 hell/ritual dokusunun 8/8'i temizlendi, sonraki bölümde ilgili etiket ve disposed yeniden kullanım sıfır. Chapel glass ve global enemy rig CPU cache'i bu sayaca dahil değildir. Testin sabit bekleme süresi native cardReady koşuluyla değiştirildi; oyun davranışı değişmedi. [Gerçek önce/sonra ve sınırlar](hell-architecture-oct26.md).

Son birleşik `56394da3…` üzerinde 15 rota noktası, native E/Space geçişi ve bölüm 9/geri 0 tekrar geçti. Üç native kamera ve bir kaynak döngüsünde 8/8 dispose, 0 diğer bölüm etiketi/yeniden kullanım ve 0 hata ölçüldü. [Son birleşik ortam raporu](verification-data/hell-architecture-oct26-final-56394da3.json).

## Teslim ve sınırlar

Testler belirtilen akışları kapsar; tüm kampanyanın hatasız olduğu veya görsellerin referansla birebir aynı olduğu iddia edilmez. Aynı makinede, aynı başlangıç kamerasında seri ABBA gerçek RAF/R ölçümü yapıldı. Shotgun/Sniper/Nail/Soul için gözlenen FPS sırasıyla 48,70→49,60 / 56,13→56,34 / 49,37→53,31 / 42,63→41,33 idi. Sniper raster süresi 10,31→12,13 ms, Soul 18,86→19,92 ms arttı; büyüyen görünür yüzeyler ücretsiz değildir. Bunlar headless Chrome ve bu sahnedeki kısa bütün-build ölçümleridir, genel FPS garantisi veya optimizasyon iddiası değildir. [Ham ölçüm ve özet](verification-data/arsenal-model-oct26-performance-summary.json).

Paket `dist/THE-BLACK-SILENCE-2026-10-26-ARSENAL.zip`, açıkça stage edilmiş/takipli izinli kaynak/asset/doc/tool dosyalarından üretilir. Her girdinin SHA'sı, ana HTML ve modül/rapor manifesti doğrulanır. Private denemeler, cache, bağımlılıklar, Git metadatası ve ignored loglar dışarıda; önceki ZIP'ler korunur.
