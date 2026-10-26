# Doğrulama — 26 Ekim 2026

Teslim dosyası `THE-BLACK-SILENCE.html`, **24.890.836 bayt**. SHA256: `d6101272e6d34d5635d1a75745ad971c4ab07e9d85d5bec7b721e5a7f0813c87`.

Bu tur Shotgun/Cross parçalarının biçimini ve Cross doldurma elinin yolunu, crypt taş yüzeyleri/nişlerini ve menzilli düşmanların yakın dövüş hazırlık görünümünü geliştirir. Oyun kuralları veya bütün silah modelleri baştan değiştirilmiş değildir.

## Son birleşik dosya

Son birleşik adayda on silah için gerçek ateş/R, cephane tamamlama, silah değiştirme/tekme ve render cache akışları geçti. Önceki `7ff91371…` birleşik adayda, aynı enemy/prologue modülleriyle toxic zombie/cultist yakın saldırıları ve gerçek koşu/tekme → duvar → stagger → E zinciri geçti. Aynı adayda ortamın dört native kamerada ışık/eye/zone tutarlılığı ve beş bölüm döngüsünde kaynak temizliği doğrulandı.

Native motor ve Village sunumu byte düzeyinde korunur. Önceki yayın `56394da38ad2dff02bffb5a32900daa40cf7c6cd319be7e6a1b850145e6e376d` idi. Standart builder modül hashlerini, iki idempotent derlemeyi ve sekiz hatalı girdide yazmama korumasını kontrol eder. Son kaynak/rapor hashleri [build bilgisinde](build-info.json) bulunur.

## Silahlar

Shotgun alıcı plakası gövdeye oturtuldu ve horozu dolu hacim kazandı. Cross gövdesinin kemik/metal yüzeyleri ayrıştırıldı, menteşe ekseni belirginleştirildi. Doldurmada relic ve sol el aynı mevcut zaman zarfında birlikte taşınır; süre, cephane, idle ve uç poz kuralları korunur. [Gerçek görüntüler, karşılaştırma ve tam kapsam](weapon-structure-oct26b.md).

Yalnız viewmodels değişen V3 `1ffca607…` ile temel `56394da3…` karşılaştırmasında 660 raw RGBA/canvas/yan buffer/topRow kontrolünün 540'ı aynı, 120'si yalnız Shotgun/Cross için beklenen farktı; beklenmeyen fark sıfır. Handgun, diğer yedi silah ve tekme/bitirici pozları aynı kaldı. Cross yükleme yolu için 2.001 finite/bounded örnek, dört C1 birleşim ve altı değişmeyen bağlanma/uç noktası doğrulandı. Bunlar görsel kalite puanı değildir.

Bağımsız V2 24 kare/6 cephane uç kontrolü `9f4571fa…` adayında, Cross V3 12 kare/3 uç kontrolü `1ffca607…` adayında koştu. Bu kanıtlar final birleşik üzerinde yeniden koşmuş gibi etiketlenmez. Son `d6101272…` birleşik adayda all10 native runtime ayrıca geçti; son weapon karşılaştırması da 660 kontrolün 540 aynı/120 yalnız Shotgun-Cross farkı ile geçti. V5 Cross için 12 gerçek native kare/3 cephane uç kontrolü ve aynı 2.001 örnek/dört C1/altı uç path kontrolü yeniden geçti. Resim yüzeyleri hacimsel taşıyıcı ve hareketli parçalara bağlıdır; her açıdan tam 3B model veya referansla birebir eşitlik iddiası yoktur.

## Düşman hazırlığı

Yalnız menzilli düşmanların 1,55 birimden yakın native melee saldırısı öncesindeki hazırlık koşulu genişletildi. Hasar, cooldown, uzak atış bandı, orta mesafe boşluğu, öncelikler ve hareket korunur. Özel `280de701…` adayındaki 39 regression ve 33 durumdaki 67 eşitlik kontrolü ayrı kaynak sürümünü belirtir.

Ara birleşik `7ff91371…` üzerinde gerçek toxic zombie/cultist hazırlığı ve 12/9 hasar, ardından native koşu/tekme/duvar/10 HP stagger/E/ölüm/kontrol dönüşü geçti; page error sıfır. Son V5 yalnız silah görselini değiştirir; enemy kaynağı `977a4a42…` aynıdır. Bu tur yeni duvar veya finisher düzeltmesi iddia edilmez. [Kapsam ve raporlar](enemy-close-melee-oct26.md).

## Crypt

Üç mevcut niş, duvar tarafındaki eski footprint içinde 45 ek primitive / 540 üçgen kazanır. Crypt wall/band mevcut taş image'ını paylaşan ayrı map-owned texture kullanır; yeni ışık, resim veya shader yoktur. Dört eş kamerada draw call sayıları 173/153/64/133, materyal sayısı 234 ve referanslanan texture sayısı 54 olarak aynı kalır. Bir yeni texture clone vardır; eski band texture kullanımının kalkması net sayıyı dengeler. Image nesnesi sayısı 50→49'dur.

Çevre-only `d18df141…` adayında map yalnız üç görsel bayrak ve crypt wall/band dışında aynı kaldı; sonraki bölüm/generic niş geometrisi değişmedi. Native 15 rota, ilk canlı karşılaşma, E çıkış/Space devamı ve geri dönüş geçti. Final `7ff91371…` üzerinde dört kamera ve beş gerçek map döngüsü tekrar geçti: her defasında crypt clone 1/1 dispose, sonraki bölümde crypt etiketi/disposed reuse sıfır, ceilingRisers/wallCourse görünür. Son V5 silah revizyonunda prologue kaynağı `821bd0a3…` değişmez. [Önce/sonra ve kesin kapsam](crypt-depth-oct26b.md).

## Teslim ve sınırlar

Testler belirtilen akışları kapsar; bütün kampanyanın hatasız olduğu veya genel FPS artışı iddia edilmez. Cross üzerinde küçük inset kenarları için pahalı yuvarlak parça üretimi dört bevel yüzle değiştirildi. Buna rağmen son gerçek reload ölçümünde temel sürüme göre yaklaşık 1,5 ms raster CPU ve 3 FPS maliyet kaldı; frame p95 aynı düzeydeydi. Bu ölçüm tek makine/sahnedeki kısa native RAF akışına aittir, genel performans garantisi değildir. Kesin kayıt ve aday ayrımı silah belgesinde bulunur. Önceki ses değişikliği ve diğer kabul edilmiş çalışmalar korunur; önceki raporlar kendi gerçek input hashlerini taşır.

Paket `dist/THE-BLACK-SILENCE-2026-10-26-POLISH.zip`, açıkça stage edilmiş/takipli izinli kaynak/asset/doc/tool dosyalarından üretilir. Her girdinin SHA'sı, ana HTML ve modül/rapor manifesti doğrulanır. Private denemeler, cache, bağımlılıklar, Git metadatası ve ignored loglar dışarıda; önceki ZIP'ler korunur.
