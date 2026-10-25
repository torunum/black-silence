# Doğrulama — 25 Ekim 2026, temas ve yüzey tutarlılığı

Teslim dosyası: `THE-BLACK-SILENCE.html`, **22.651.858 bayt**. SHA256: `b823d85f6dd70b4eb795c4e17cde96cc455b3f11e1c44856a70e78444b9f2103`.

Bu tur dört dar değişiklik içerir: Stake doldurmada sol el-kazık ve bütün pozlarda sağ el-kabza teması, bitirici eldivenlerinin mevcut deri renkleriyle uyumu, kol koparma bitiricisinde tek kolun tutarlı gösterimi ve şapelin kırık vitrayında yüzey ayrıntısı. Yeni silah modeli, cephane dengesi veya genel FPS artışı iddiası yoktur.

## Kaynak ve derleme

Standart derleme bütün gömülü modülleri kaynaklarıyla karşılaştırdı; iki tekrar aynı çıktıyı verdi ve sekiz geçersiz girdi dosyalara yazmadan reddedildi. Native motor SHA256 `6dd6c59430c843ef82b065bde2eba13fab8ce9d166876ba2877e6e90882e7899` ve Village SHA256 `d60bd40de6b093eadcfb9e3f99d822c0987250813647484bef79b73c96a0d627` değişmedi. Modül ve rapor hashleri [build bilgisinde](build-info.json) bulunur. Önceki teslimat `6dd69003987fadb8c4b405d3e94d3833e303d37a86484e33c4ed2fb556c75c99` idi.

## Doğrulanan davranış

Son b823d85f dosyasında on silah için gerçek doldurma/ateş/geçiş/tekme ve cache kontrolleri tekrar geçti. Sağ kabza/kol devamı düzeltmesinin 697219ab→b823 karşılaştırmasında 660 pozun 600'ü birebir eşit, yalnız Stake9'un 60 pozu amaçlı farklıydı; beklenmeyen fark veya çalışma hatası yok. Bu karşılaştırma diğer dokuz silahı, botları ve bitiricileri de kapsar.

Önceki birleşik 697219ab adayında on silah için gerçek R/RAF doldurma, cephane aktarımı, ateş, geçiş, tekme/iptal ve cache çizim kalıntısı kontrolleri geçti. 3600 compositor vakası eşit kaldı. Aynı d4e viewmodels kaynağını içeren db1a400a ara adayındaki silah çizim karşılaştırması 660 pozda 600 eşit, 24 amaçlı Stake erken-temas farkı ve 36 amaçlı bitirici eldiven farkı verdi; beklenmeyen fark yok. Bu karşılaştırma son dosyada yeniden koşulmuş gibi sunulmaz. Ayrı 21 bitirici pozunda geometri derinliği, parça kimliği, eldiven maskesi ve eldiven dışındaki bütün pikseller eşittir. Normal dönüş ve hata durumunda geçici materyal yönlendirmesi geri yüklenir. [Stake ve eldiven kanıtları](stake-contact-oct25.md).

697219ab ara adayında üç bitirici türü gerçek E girdisiyle tamamlandı; hedef öldü, sağlık ödülü verildi, silah geri geldi ve gerçek hareket/ateş girdileri tekrar çalıştı. 32 kontrollü olay/lifecycle kontrolü, elde tutulan kolun dünyaya ikinci kez çıkmadığını ve yalnız normal bitişte bir kez bırakıldığını doğruladı. Native oyuncu ölümü ve bölüm yüklemesi bekleyen parçayı iptal etti; tekrar cleanup ikinci parça oluşturmadı. Yara, kan, ses, darbe zamanlaması ve ödül korunur. Önceki combat adayı ayrıca 35 combat ve 27 düşman animasyonu kontrolünden geçti; bunlar son dosyada yeniden koşulmuş gibi sunulmaz. Son b823d85f dosyasında aynı combat kaynağıyla gerçek E kind2 ve ardından hareket/ateş geri dönüşü ayrıca geçti. [Bitirici kapsamı ve kanıtları](execution-consistency-oct25.md).

Vitray için ortam-adayı cd5579d7, son sürümdeki aynı b010 prologue kaynağını kullanır. Tüm harita verisi, şapel geometri/dönüşümleri, üç özgün cam rengi ve ilgisiz materyaller birebir aynı kaldı. Tek ortak 32×64 doku eklendi. Beş gerçek bölüm geçişi/dönüş döngüsünde dokuz scoped dokunun tamamı temizlendi, sonraki bölümde ilgili materyal kalmadı ve temizlenmiş doku yeniden kullanılmadı. Dönüşte resident doku sayısı 44 olarak sabit kaldı. Eşleşmiş görüntüler native göz yüksekliği ve gerçek churchyard ışık/sis ayarlarını kullanır. [Cam görüntüleri ve kaynak ömrü](chapel-glass-oct25.md).

Görüntü ve raporların tam girdi hashleri kendi provenance dosyalarındadır. Ortam-adayı, önceki silah-adayı veya kontrollü kareler son birleşik gerçek zamanlı oynanış kaydı diye etiketlenmez. Bağımsız kaynak incelemeleri, kol ertelemesinin completion/cancel ayrımını, geçici native çağrıların finally ile geri yüklenmesini ve camın yalnız üç materyalde kalmasını doğruladı.

Son sağ kabza düzeltmesi Stake sağ elinin sabit ankrajını günceller; normal duruş, ateş ve doldurma boyunca aynı rig içinde kalır. Ultrawide görünümde yalnız bu sağ elin mevcut bitmap quad'ı mevcut yan kol çizim geçişine katılır; merkez derinlik maskesi native alanı tekrar çizdirmeden açık kol kesitini kapatır. Üç ekran oranında son b823 adayının doldurma/idle/cephane bitişi bağımsız kontrol edildi. Diğer silahlara bu seçenek uygulanmaz.

## Sınırlar ve paket

Bu tur yeni performans iyileştirmesi iddiası yoktur. Silahlar gerçek hacim ve hareketli parçalara bağlı perspektifli resim yüzeyleri kullanır; tam serbest açılı 3B model değildir. Önceki [doldurma kadrajı](reload-framing-oct24d.md) kontrolleri kendi tarihli sürümlerine aittir; Sniper şarjörünün altı bazı pozlarda ekran kenarını aşabilir. Testler belirtilen akışları kapsar, bütün kampanyanın hatasız olduğu anlamına gelmez.

Yeni paket `dist/THE-BLACK-SILENCE-2026-10-25-DETAILS.zip` adıyla oluşturulur. HTML, build-info ve paket girdileri kaynak dosyalarıyla eşleştirilir. Önceki paketler korunur; `.dream-loop`, bağımlılıklar, özel denemeler ve Git metadatası dahil edilmez.
