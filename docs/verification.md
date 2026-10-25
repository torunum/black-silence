# Doğrulama — 25 Ekim 2026, doldurma hareketi ve cehennem pencereleri

Teslim dosyası: `THE-BLACK-SILENCE.html`, **22.656.762 bayt**. SHA256: `4b03db10fcf7433e90e2f21e662224d79ce356f3e2bac392ab7ab21cd09c6198`.

Bu tur Rifle/Tommy şarjör yerleştirme hareketini native olaya hizalar, bitiricinin son vuruşundan sonraki görüş kaymasını giderir ve cehennemin üç pencere grubuna taş derinliği ekler. Cephane, hasar, düşman davranışı ve genel bölüm rotası korunur. Yeni FPS kazancı iddiası yoktur.

## Derleme ve son dosya

Son birleşik adayda on silahın gerçek R/RAF doldurma ve cephane tamamlama, ateş, değiştirme, tekme ve çizim cache kontrolleri geçti. Standard builder iki tekrarda aynı çıktıyı üretti; sekiz geçersiz girdi dosya yazmadan reddedildi. Bütün kaynak modülleri gömülü karşılıklarıyla eşleşti.

Native motor SHA256 `6dd6c59430c843ef82b065bde2eba13fab8ce9d166876ba2877e6e90882e7899` ve Village SHA256 `d60bd40de6b093eadcfb9e3f99d822c0987250813647484bef79b73c96a0d627` değişmedi. Önceki yayın `38b1a9aa2933d1523ba2607f3ae39d6d977b926b4d483d031112e085eb078b95` idi. Son modül/rapor hashleri [build bilgisinde](build-info.json) bulunur.

## Doldurma

Rifle ve Tommy'nin şarjör/tambur dönüşü native `rc.seat` / `Ac.seat` aralıklarını izler ve `.60` yerleştirme olayında yerine oturur. İlk çıkarma eğrisinin özgün aritmetiği, el ve parçanın ortak dönüşümleri, geç sürgü/kol hareketi, ses ve cephane korunur.

Weapon-only adayındaki 2002 eğri örneği sınırlı hareketi, sekiz smoothstep birleşimi hız sürekliliğini, bütün kaynak karşılaştırması yalnız iki authored ifadeyi doğruladı. Native ekran oranı ve gerçek R görüntüleri ayrı raporlanır; bunlar final birleşik dosyada tekrar çalışmış gibi etiketlenmez. [Görsel/zamanlama kapsamı](reload-seating-oct25c.md).

## Bitirici

Son birleşik `4b03…` üzerinde üç tür gerçek E/RAF bitirici tamamlandı; ardından native W, ateş ve fareyle bakış çalıştı. Koşu/dropkick → duvar → sendeleme → E zincirindeki 20 terminal karede son vuruş konumu ve görüş yönü sabit kaldı, hata oluşmadı.

Aynı combat kaynağını içeren `ee6dca45…` özel adayında 132 izole durum ve önceki 32 kol yaşam döngüsü kontrolü geçti. Eş deterministik koşulda 1.275 düşman/sağlık/ödül/vuruş/zamanlayıcı/dikey durum örneği, bunların içindeki 843 canlı hedef kamera örneği birebir aynıydı. Son vuruş öncesi davranış korunur; yeni engel kaydedilen konumu bozarsa native yatay konum çözümü kalıcı olarak devralır, görüş yönü korunur. Bu kontrollü kurulumlar kampanyanın bütün rastgele karşılaşmaları değildir. [Ayrıntılı kapsam](finisher-recovery-oct25c.md).

## Cehennem pencereleri

Yalnız üç `hellLancetShrine` pencere grubunda mevcut stone/edge/wrought yüzeyleri değişir. Her birine 24 primitive, toplam 72 primitive/864 üçgen eklenir. Altı eş kamerada draw call ve texture/material/renderer geometry sayıları aynı kaldı. Cam yüzeyleri, kaide, ışıklar ve tüm harita/grid/çarpışma/rota/düşman/eşya verisi birebir eşittir.

`fd74059e…` çevre-only adayında native 15 yürüyüş noktası, ilk canlı encounter, eşya alımı, E çıkış ve sonraki bölüme varış geçti. Beş gerçek bölüm geçişinde scoped hell/ritual dokularının 8/8'i temizlendi, sonraki bölümde ilgili etiket ve temizlenmiş doku yeniden kullanımı sıfırdı. Resident renderer 59 bu koşuda sabitti; global enemy cache'in toplam CPU bitmap sayısı değildir. [Önce/sonra ve kanıt](hell-lancets-oct25c.md).

Son birleşik `4b03…` üzerinde altı native göz yüksekliği/bölge ışığı kamerası ve beş gerçek bölüm geçişi ayrıca geçti. Scoped 8/8 doku temizliği, sıfır sonraki-bölüm etiketi ve sıfır temizlenmiş doku yeniden kullanımı doğrulandı. Eski görsel çiftlerinin fd740 provenance bilgileri korunur; final kontrolü [ayrı raporda](verification-data/hell-lancets-oct25c-final-4b03.json) yer alır.

## Sınırlar ve paket

Testler belirtilen akışları kapsar; bütün kampanyanın hatasız olduğu iddia edilmez. Önceki Soul/Stake temas, cam ve ilk temas hazırlığı kanıtları kendi tarihli sürümlerine aittir. Silahlar gerçek hacim/hareketli parçalara bağlı resim yüzeyleri kullanır, tam serbest açılı modeller değildir.

Yeni paket `dist/THE-BLACK-SILENCE-2026-10-25-REFINEMENTS.zip`. Yalnız Git'te takipli veya açıkça stage edilmiş izinli kaynak/asset/doc/tool dosyaları alınır. Her ZIP girdisi, HTML ve modül/rapor manifest hashleri çalışma dosyalarıyla eşleştirilir. Ignored loglar, özel denemeler, bağımlılıklar ve Git metadatası dışarıda; önceki ZIP'ler korunur.
