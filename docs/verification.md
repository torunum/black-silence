# Doğrulama — 24 Ekim 2026, Tommy, Sniper ve Nail doldurma görünürlüğü

Teslim dosyası: `THE-BLACK-SILENCE.html`, **22.648.018 bayt**. SHA256: `6dd69003987fadb8c4b405d3e94d3833e303d37a86484e33c4ed2fb556c75c99`.

Tommy'nin tamburu, Sniper'ın şarjörü ve Nail'in yükleme kabı ile ilgili eller doldurma ortasında ekranın altına kayıyordu. Bu üç silahın bütün çizimi, yalnız yükleme aşamasında yumuşak bir zarfla yukarı alınır. Tommy'nin tambur ve sol elinin ortak çıkarma yolu da kısaltıldı. Geç kol çekme/kapama ve normal duruşa dönüş ayrıca kontrol edildi. Yeni model veya çevre değişikliği yapılmadı.

## Kaynak ve derleme

Standart derleme, gömülü modüllerin kaynak dosyalarla eşleşmesini ve native motor/Village bloğunun korunmasını denetler. Son derleme sonucu ve idempotency kayıtları build bilgisine dahildir.

Motor SHA256 `6dd6c59430c843ef82b065bde2eba13fab8ce9d166876ba2877e6e90882e7899`, Village SHA256 `d60bd40de6b093eadcfb9e3f99d822c0987250813647484bef79b73c96a0d627` ve prologue SHA256 `c7614fb312a6171350279bc2cd7cfbc27984c60e13d8d5ddfdf944ffb36176c7` aynıdır. Düşman, combat, ses ve cephane/zamanlama kuralları değişmez. Modül ve rapor hashleri [build bilgisinde](build-info.json) bulunur. Önceki teslimat `d5a41a6872cb7b58f0e7f4b95c58e55d466f520070a64adfa2cf66cc1df564df` idi.

## Doğrulanan davranış

Son 6dd69003 adayında on silah için gerçek R/RAF doldurma, cephane aktarımı, ateş, geçiş, tekme/iptal ve çizim kalıntısı kontrolleri geçti; cache tekrarlarında sunum offseti birikmedi. 661 karşılaştırmada 543 eşitlik ve yalnız 3/4/6 doldurma pozlarında 118 amaçlı fark vardı; beklenmeyen fark yok. 3600 compositor testi eşit kaldı.

Bağımsız görsel kontrol toplam 45 gerçek R/RAF kare ve 9 şarjör/idle bitişi içerir: Tommy/Nail için 824314e9 adayında 36 kare, Sniper için son 6dd adayında 9 kare. Eski aday kontrolleri son dosyada yeniden çalışmış gibi etiketlenmez; son on silahlı çalışma ayrıca doğrulanmıştır. Sniper'ın test edilen .12/.82 bolt pozları birebir aynı kalır. Geçiş çevresindeki küçük bütün-silah offseti, bolt ve elin birbirine göre rig'ini değiştirmez. Sniper şarjörünün altı bazı orta pozlarda hâlâ ekran kenarını aşar; tam şarjörün sürekli görünür olduğu iddia edilmez.

Yukarı taşıma, native çizim sınırını belirleyen `topRow` sunum değerine yalnız taze raster üretildiğinde uygulanır. Önceki değer native kod tarafından yeniden hesaplanır; cache tekrarlarında eklenerek büyümez. Silah, eller ve hareketli parçalar aynı görüntü konumunu paylaşır; ölçek, derinlik ve native motor kodu değişmez. Kick/finisher, diğer silahlar ve idle bu yeni zarfın dışında kalır. Bu sınırlar bağımsız kod incelemesinde kontrol edildi.

[Son hareket kanıtı](reload-framing-oct24d.md) gerçek R/RAF kontrollerini, görüntüleri ve medya girdilerinin hashlerini ayrı etiketler. Kontrollü kareler gerçek zamanlı video olarak sunulmaz. Kalıcı geçmiş kanıtlar [Rifle kadraj düzeltmesi](rifle-reload-oct24c.md), [ritüel/lav materyalleri](ritual-ivory-oct24c.md), [kol devamı](weapon-animation-oct24b.md) ve [düşman inişi](enemy-landing-oct24.md) içinde korunur; bunlar bu tur yeniden yapılmış değişiklikler değildir.

## Sınırlar ve paket

Bu tur genel FPS artışı iddiası yoktur. Önceki renderer deneyleri ve kısa Rifle ölçümleri kendi tarihli sürümlerine aittir. Silahlar gerçek hacim ve hareketli parçalara bağlı perspektifli resim yüzeyleri kullanır; tam serbest açılı 3B model değildir. Bazı doldurma parçaları ekranın alt kenarına yaklaşabilir; hedef mekanik hareketi daha görünür kılmaktır. Testler belirtilen akışları doğrular; bütün kampanyanın hatasız olduğu anlamına gelmez.

Yeni paket `dist/THE-BLACK-SILENCE-2026-10-24-RELOADS.zip` adıyla oluşturulur. HTML, build-info ve paket girdileri kaynak dosyalarıyla eşleştirilir. Önceki paketler korunur; `.dream-loop`, bağımlılıklar, özel denemeler ve Git metadatası dahil edilmez.
