# Doğrulama — 27 Ekim 2026

Teslim dosyası `THE-BLACK-SILENCE.html`, **24.894.597 bayt**. SHA256: `17ebe0d27fdcef2eea80b54fbc68ebf0cfa96b51c0244bd2a56e85ac22155d61`. Ana dosya standart builder ile bu test edilmiş hash’e byte-identical üretildi; paket bütünlüğü aynı hash ile doğrulanır.

Bu tur sekiz silahın mekanik gövde/yüzey ayrıntılarını ve Monastery/Dungeon taş mimarisini geliştirir. Handgun ve Cross bu tur korunur. Cephane, hasar, native oyun kuralları veya tüm modellerin baştan yapıldığı iddia edilmez.

## Silahlar ve oynanış

Final birleşik üzerinde on silah için gerçek R/cephane tamamlanması, ateş, silah değiştirme/tekme ve cache akışları geçti. Silah çizimi karşılaştırmasında 660 raw RGBA/canvas/yan buffer/topRow kontrolünün 192'si aynı, 468'i yalnız değişen sekiz silah için beklenen farktı; beklenmeyen fark sıfır. Handgun/Cross ve tekme/bitirici kapsamı aynı kaldı. Bu karşılaştırma görsel kalite puanı değildir.

Bağımsız üç viewport'taki 135 native idle/fire/reload kare ve 27 cephane uç kontrolü, yalnız silah değişen `4edca614…` adayı üzerinde geçti. Bu adayın `99bd9d09…` viewmodels kaynağı final birleşikte aynıdır; final birleşikte yeniden 135 kare koşulmuş gibi etiketlenmez. [Görseller, model kapsamı, ölçüm ve kaynak kimlikleri](arsenal-reference-oct27.md).

Gövde biçimleri mevcut referans çizimlerinden türetilmiş resim yüzeyleri ve hacimsel taşıyıcılarla oluşturulur; bütün açılarda tam 3B veya referansla birebir eşitlik iddiası yoktur. Silah performans örnekleri kısa native RAF kayıtlarıdır; host varyansı ve silaha göre maliyetler detay raporda tutulur, genel FPS artışı iddia edilmez.

## İki bölümün mimarisi

Ash Bell Monastery mezar odası girişi ve Gothic Dungeon'ın üç hücresi katmanlı taş söve/sivri kemer kazandı. Merkez Dungeon hücresinde üç mum ve tek sınırlı native sıcak ışık odak oluşturur. Yeni doku veya global ışık ayarı yoktur. Monastery +324, Dungeon +1392 authored üçgen; Dungeon materyal 185→186, ışık 19→20, texture 25 sabittir. Bunlar ayrı haritalardır.

Çevre-only `bb65a063…` üzerinde, önceki yayın `d6101272…` ile paired native test map/grid/kapı/encounter/pickup tanımlarını ve 775+1587 collision/elevation örneğini karşılaştırdı. İzinli bir görsel bayrak/ışık dışında map exact. Gerçek W hareketiyle önce 8, sonra 24 waypoint ve altı değişimli map rebuild geçti. Yeni ışık yalnız Dungeon'da 1; eski light nesneleri yeni sahnede kullanılmıyor, texture sayıları sabit, page error sıfır. Bu test bütün bölümün oynanması veya kapı açılması testi değildir.

Final birleşik aynı `66b89378…` çevre kaynağını byte-identical içerir. Final 17ebe ile baseline arasında ayrıca tek tarayıcıda seri 6 sn Dungeon RAF ölçümü yapıldı: FPS 55,96→56,03, p95 her ikisinde 18,1 ms, renderer.render CPU 0,684→1,105 ms. Bu kısa sahnede frame-rate düşüşü gözlenmedi; ek ışık/mimari CPU maliyeti vardır. [Eş kameralar, kaynak kapsamı ve raporlar](chapter-architecture-oct27.md).

## Derleme ve teslim

Native motor ve Village sunumu byte düzeyinde korunur. Standart builder bütün modül hashlerini, iki idempotent build'i ve sekiz hatalı girdide yazmama korumasını kontrol eder. Kesin final kaynak/rapor hashleri [build bilgisinde](build-info.json) bulunur. Önceki ses, düşman ve combat iyileştirmeleri korunur; bunlar bu tur yeni düzeltme veya yeniden koşulmuş test olarak sunulmaz.

Paket `dist/THE-BLACK-SILENCE-2026-10-27-ARSENAL.zip`, açıkça stage edilmiş/takipli izinli kaynak/asset/doc/tool dosyalarından üretilir. Her girdinin SHA'sı, ana HTML ve modül/rapor manifesti doğrulanır. Private adaylar, cache, bağımlılıklar, Git metadatası ve ignored loglar dışarıda; önceki ZIP'ler korunur.
