# Doğrulama — 24 Ekim 2026, animasyon turu

Teslim dosyası: `THE-BLACK-SILENCE.html`, **22.645.527 bayt**. SHA256: `9cecdb74a11b616d9bfe12c031f2ff1c3e543f103cbc21dba6f280fdecd0e1f9`.

Ana HTML, derleme bilgisi ve teslim paketi aynı doğrulanmış sürümü içerir.

Bu tur Sniper'ın sürgüyle temas eden elini, Soul'un doldurma sırasındaki enerji geçişini, bazı pozlarda görüntü içinde kesilen deri kol uçlarını ve savrulmadan sağ çıkan düşmanların iniş tepkisini düzeltir. Silah/karakter tasarımı yeniden yapılmadı. Hasar, cephane, doldurma süreleri, düşman sağlıkları, stagger olasılığı, AI, çarpışmalar ve bölüm yerleşimi korunur.

## Derleme ve kaynak sınırları

Standart derlemenin iki tekrarı aynı adayı üretir; sekiz bozuk marker girdisi yazılmadan reddedilir. Motor SHA256 `6dd6c59430c843ef82b065bde2eba13fab8ce9d166876ba2877e6e90882e7899`, Village SHA256 `d60bd40de6b093eadcfb9e3f99d822c0987250813647484bef79b73c96a0d627` korunur. Ayrıntılı modül/rapor hashleri [build bilgisinde](build-info.json) bulunur.

Önceki teslimat `41f9646703cce0a5da5b6b063df10bf60de84c9c821ffb5f65255ce0a6443448` idi. `791b9d33…` ara adayı kol devamı düzeltmesinden önceki kontrolleri içerir; son dosyayla karıştırılmaz.

## Kontrol kapsamı

- Sniper'da el ve sürgü ortak pivotu paylaşır. Soul'da enerji söndürme/yenileme geçişi devamlıdır. Kol devamı mevcut el/manşet UV'lerini değiştirmeden yalnız bitmap dışındaki deri yüzeyi uzatır; native derinlik ve kamera kırpması kullanılır. Geniş ekranlarda native silah tuvalinin dışında kalan yalnız kol devamı, ortası şeffaf ayrı bir kenar tamponunda çizilir; silah ölçeği ve kadrajı değişmez.
- Yaşayan düşmanın havadaki rig'i ve 0,32 saniyelik görsel inişi; native saldırı/stagger önceliği, uzak aktörde texture bırakma, ölüm ve reset davranışlarıyla kontrol edilir. Yeni stun süresi eklenmez. [Ayrıntılı düşman kanıtı](enemy-landing-oct24.md).
- On silah için gerçek R/RAF doldurma, cephane, ateş, geçiş, tekme/iptal ve çizim kalıntısı kontrolleri son 9cec adayında geçti; sayfa hatası yok. İşlevsel test kare süreleri FPS karşılaştırması değildir.
- Görünüm değişiklikleri amaçlıdır: önceki sürümle tüm silah piksellerinin birebir aynı olduğu iddia edilmez. İlk iki hareket düzeltmesinin 616 karşılaştırmasında 579 eşit/37 amaçlı fark vardı; bu ara sonuç sonraki kol devamının final eşitlik iddiası değildir.

## Değişmeyen bölüm ve ses

Prologue kaynağı `7d94d4e54dbc0df11a2f29650e9129c9690d722bed0ffc556ac923d9f5200109` olarak aynen korunur. Yeni ışık, dekor, rota veya düşman yerleşimi eklenmedi. Görsel doğrulama aracının duraklatılmış kamera konumunda yanlış bölge ambiyansını koruması düzeltildi: native göz yüksekliği ve native zone geçişi kullanılır. Önceki 41f sürümünde üç kamera ve beş bölüm ayrılış/dönüşü; sıfır texture reuse/leak ve kaynak byte korunumu doğrulandı. Bu test fixture düzeltmesidir, oyunu aydınlatma değişikliği değildir. [Yöntem ve kanıt](hell-environment.md).

Doldurma kayıtları, ses zaman çizelgeleri ve önceki native ölümde ses durdurma düzeltmesi korunur. 49 ses kontrolü 791b ara adayında geçti; o testin girdisi son sürüm gibi etiketlenmez. Sonraki değişiklikler yalnız görsel kol devamını etkiler; ses kaynağı ve native zaman çizelgesi byte olarak aynıdır. Önceki 15 noktalı gerçek bölüm yürüyüşü/E çıkışı kanıtı tarihsel olarak korunur; değişmeyen bölüm için bu tur yeniden yürünmüş gibi sunulmaz.

## Görsel yöntem, medya ve ölçüm sınırları

Silahlar gerçek hacimli arka/yan yüzeylere ve hareketli parçalara bağlı perspektifli resim yüzeyleri kullanır; tam serbest açılı 3B varlık değildir. Bazı yüzey ışıkları resimde sabittir. Cehennem mimarisinin statik ışıkları dinamik namlu parlamasına tepki vermez; normal karakter/nesne ışıkları korunur.

[Son silah hareket kanıtları](weapon-animation-oct24b.md) ve kayıtları `docs/weapon-animation-oct24b/`, düşman inişi kanıtı `docs/enemy-landing-oct24/` içindedir. Sabit zamanlı kontrollü sahneler ile gerçek klavye/fare/RAF kayıtları ayrı etiketlenir. `docs/previews/arsenal-reload.webm` ve eski silah görüntüleri 23 Ekim teslimatından korunmuştur; yeni çekim değildir. Tasarım hedefleri `assets/` içinde ayrı tutulur.

[Önceki renderer ölçümleri](renderer-performance-2026-10-24.md) 5c071→41f karşılaştırmasına aittir; 9cec sürümünün FPS kazancı olarak kullanılmaz. Son 41f→9cec seri ABBA doldurma ölçümünde ortalama kare hızı Sniper için 54,16→50,80; Soul için 53,23→54,06; rifle için 56,00→55,93; Cross için 54,79→52,61 FPS oldu. Sniper/Cross tarafındaki ek çizim maliyeti ölçümde görünür; [ham süre özeti](verification-data/animation-oct24b-performance-summary.json) korunur. Bunlar aynı sahnede headless Chrome ve bu makinedeki kısa ölçümlerdir. Bu tur için sabit FPS veya bütün cihazlarda performans iyileşmesi iddiası yoktur. Testler belirtilen akışları doğrular; tam kampanya oynanışı veya bütün hataların bulunmuş olduğu anlamına gelmez.

Son paket `dist/THE-BLACK-SILENCE-2026-10-24-ANIMATIONS.zip` adıyla ayrı oluşturulur. ZIP içindeki HTML ve build-info hashleri ana dosyayla eşleştirilir; önceki ZIP'ler değiştirilmez.
