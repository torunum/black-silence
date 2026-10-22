# The Black Silence

Mevcut oyunun piksel grafikleri, haritaları, sesleri ve kayıt sistemi üzerine yapılmış silah, yakın dövüş ve prologue güncellemesi.

## Oyna

`THE-BLACK-SILENCE.html` dosyasını Chrome veya Edge ile aç. Oyun tek HTML dosyasıdır; internet bağlantısı ve kurulum gerektirmez. Ses ve fare kontrolü için oyun alanına tıkla.

Yerel sunucuyla açmak için Node.js kurulu bir terminalde:

```sh
npm start
```

Adres: `http://127.0.0.1:8765`. Eski kayıtlarını kullanmak için oyunu daha önce kullandığın tarayıcı ve adresten aç; dosya ve yerel sunucu farklı kayıt alanları kullanır.

| Eylem | Kontrol |
| --- | --- |
| Hareket | W A S D |
| Koş | Shift |
| Ateş | Sol fare |
| Doldur | R |
| Tekme | Sağ fare |
| Drop kick | İleri doğru koşarken sağ fare |
| Etkileşim / sendeleyen düşmanı bitir | E |
| İlk iki silah | 1 / 2 |

Drop kick için yerde olmak ve yeterli ileri hıza ulaşmak gerekir. Düşman kritik cana indiğinde bazen sendeleyebilir; önüne yaklaşıp E istemi görünürken bitirici başlatabilirsin.

[Oyun içi kısa video](docs/combat-preview.webm) · [Prologue görüntüsü](docs/prologue.png) · [Tüfek](docs/shotgun.png) · [Drop kick](docs/dropkick.png) · [Bitirici](docs/finisher.png)

[Şapel](docs/chapel.png) · [Kript](docs/crypt.png) · [Köprü](docs/bridge.png) · [Arena](docs/arena.png) · [Bot tabanı](docs/boot-sole.png)

[Manastır mezar hücresi](docs/monastery-crypt.png) · [Zindan hücre galerisi](docs/dungeon-gallery.png)

[Doldurma seslerini dinle](docs/audio/reload-audit.wav) · [Ses kaynakları ve lisansları](docs/audio-sources.json)

[Tabanca doldurma](docs/pistol-reload.png) · [Tüfek doldurma](docs/shotgun-reload.png) · [Altar kompozisyonu](docs/chapel-altar.png)

## Bu güncellemede

İki silahın doldurma hareketlerinde ayrı açma, boş kovan çıkarma, fişeği yerleştirme, parmakları bırakma, kapatma ve yeniden kavrama evreleri var. Koyu deri manşetler ve kompakt kafatası/namlu oranları mevcut gotik piksel görünümünü koruyor.

İlk iki silahın sağ eli; basık, çapraz duran deri el sırtı, kompakt bilek ve kabzayı arkasından saran parmaklarla yeniden kuruldu. Önkol bileğe doğru daralır. Doldurmada yerleşen fişek haznede kalır, destek eli kapanış boyunca görünür; kovanın kameraya yaklaşarak büyümesi düzeltildi. Çift namlulunun kapalı mekanizmasında namlu arkalarını örten sabit kalkan bulunur.

Düşman adımları gerçek ilerleme mesafesine bağlandı; saldırı hazırlığı, darbe yönüne tepki ve stagger toparlanması eklendi. Şapelde kırık vitraylı taş niş, kripte kemik nişleri, köprü başlarına oyma işaretler ve arenaya sınırlı köz hareketi eklendi.

- İlk tabanca ve çift namlulu tüfeğin modelleri, tutuşu, geri tepmesi ve doldurma hareketleri yenilendi.
- Eldivenler, parmaklar, bilekler, manşetler ve botlar yeniden modellendi. Bot tabanı ayak konturunu izler; topuk ve içeri alınmış dişler ayrı biçimlere sahip. Tekme ve iki ayaklı drop kick için ayrı hareket eğrileri kullanıldı.
- Normal düşmanların canı önceki değerlerine göre %25 artırıldı. Boss canları aynı kaldı.
- Canı %23 veya altına inen uygun düşmanın bir kez %38 stagger şansı var. Stagger 4,6 saniye sürer; ölümcül vuruşlar düşmanı normal şekilde öldürür.
- Üç ayrı bitirici hareket, vuruş anlarıyla eşleşir. Bitirici 15 can kazandırır; aynı ölüm ikinci kez sayılmaz.
- Güçlü savrulma, duvar çarpışması ve düşük kare hızında duvardan geçmeyi engelleyen hareket kontrolleri eklendi.
- Duvara savrulan canlı düşmanlar zemine inip yürüyüş/saldırıya döner; cesetler havada asılı kalmaz. Çarpışma, beden genişliğini ve dönen sprite'ın sınırlarını gözetir.
- Prologue girişine sıcak mumlar, kızıl kript ışığı ve mezarlık ayrıntıları eklendi. Şapelde isteğe bağlı tüfek, ek cephane ve bağlama göre kısa yönlendirmeler bulunur. İlk karşılaşmaların yerleri düzenlendi; haritanın geçişleri ve yükseklikleri korundu.
- Giriş zemini kırık taş adaları ve çökmüş mezar kapaklarıyla derinleştirildi. Manastırın mezar hücresinde taş kapı çerçevesi ve nişler, zindanın hücre galerisinde demir parmaklıklı duvar bölmeleri bulunur; bu eklemeler yeni çarpışma yüzeyi veya ışık yükü oluşturmaz.
- Kript cephesinde taş kaide/kornişlere bağlı kararmış mezar levhaları ve aşınmış yazıtlar, şapelde kırık taş altar çerçevesi bulunur. Manastırda mühürlü mezar levhaları ile açık kemik rafları, zindanda sığ taş kuşaklar ve yerel su izleri duvarların ritmini güçlendirir. Harita geçişleri ve mevcut ışık sayısı korunur.
- İlk iki silahın doldurmasında kilit, menteşe, kovan ve fişek temasları için kayıt kaynaklı mekanizma sesleri kullanılır; ses ve el hareketi aynı zamanlama verisine bağlıdır. Kaynaklar CC0 lisanslıdır; ayrıntı `docs/audio-sources.json` içindedir.

## Kaynak ve derleme

Orijinal teslimat derlenmiş tek HTML olduğundan, motor ve mevcut içerik dosyanın içinde korunur. Düzenlenebilir eklemeler `src/` altında tutulur; derleyici bunları motor başlamadan önce tek bir işaretli bloğa yerleştirir.

Motor bağlantıları ve modül sırası [geliştirme notlarında](docs/development.md).

| Dosya | İçerik |
| --- | --- |
| `src/combat.js` | Can dengesi, stagger, tekme, savrulma, bitirici kuralları |
| `src/enemy-animation.js` | Mesafeye bağlı adım ritmi, saldırı hazırlığı, darbe tepkisi ve stagger pozları |
| `src/viewmodels.js` | İlk iki silah, eller, botlar, doldurma ve tekme pozları |
| `src/finishers.js` | Üç bitiricinin el ve kol animasyonları |
| `src/reload-audio-data.js` | Gömülü 16 bit PCM doldurma örnekleri |
| `src/reload-audio.js` | İlk iki silah için animasyonla ortak zamanlama ve özgün effects ses yolu |
| `src/prologue.js` | İlk bölümde dekor, ışık ve yönlendirmeler; manastır ve zindanda seçili mimari ayrıntılar |
| `src/render-warmup.js` | İlk yakın dövüş efektinden önce shader hazırlığı |
| `src/materials.js` | Küçük, gömülü malzeme ton haritaları |
| `assets/materials.png` | Bu oyun için üretilmiş deri, metal, ahşap ve kemik doku atlası |

```sh
npm ci
npm run build
npm test
npm run test:smoke
npm run test:compatibility
npm run test:enemies
npm run test:visual
npm run test:navigation
npm run test:walls
npm run test:levels
npm run test:audio
```

Testler kurulu Chrome kullanır. `npm test` gerçek silah isabeti, can/stagger/bitirici geçişleri, tekme çarpışmaları ve prologue haritasını kontrol eder. `test:smoke`, gerçek animasyon döngüsünde drop kick ve E girdisini çalıştırır, 11 bölümü açar ve `.dream-loop/` içine ekran görüntüleri ile kare süresi raporu yazar. Bu ölçümler çalıştırılan bilgisayara bağlıdır.

`test:visual`, kript ışığının yalnızca sahnede bulunmasını değil, gerçek başlangıç görüntüsünde görünmesini de kontrol eder.

`test:audio`, teslim HTML'sindeki gerçek WebAudio ve silah güncellemesiyle ses örnekleri, ortak zamanlama, ses ayarları, duraklatma/iptal ve temizliği denetler. Dinleme WAV'ı son örnek ve zamanlardan offline üretilir; gerçek zamanlı çıktı kaydı sesli videodadır.

`test:levels`, teslim HTML'sindeki manastır ve zindan üreticilerini özgün üreticileriyle karşılaştırır. Harita, yükseklik, kapı, eşya, düşman ve önceki dekorun korunmasını; ek collider/ışık olmamasını ve yeniden yüklemede birikmemeyi doğrular. Görseller sabit inceleme kameralarından alınır; tam bölüm oynanışı sayılmaz.

`test:navigation`, son derlenmiş HTML üzerinde gerçek oyuncu hareketiyle şapele gider, isteğe bağlı tüfeği alır ve ilk düşmana canlı AI ile ulaşır. Ardından AI durdurularak köprüler, arena, doğu merdivenleri ve E ile çıkış etkileşimi çarpışma/yükseklik açısından denetlenir. Bu ikinci kısım zorluk dengesi testi değildir. Ekran görüntüleri ve sonuçlar `.dream-loop/navigation/` altına yazılır.

`test:walls`, savrulan düşmanların duvar, köşe ve dekor çarpışmalarını farklı zaman adımlarıyla kontrol eder; canlı, duvarda ölen ve tekmede ölen hedefleri ayrı değerlendirir. Son bölümde gerçek animasyon döngüsü de çalıştırılır.

`test:compatibility`, özgün v1 kayıt biçiminden bölüm kilitlerini ve ayarları yükler; bir ayarı değiştirip sayfayı yeniden açar ve önceden açılmış bir bölümü başlatır. Testler ayrı, geçici tarayıcı profilleri kullanır.

Son kontrolün kapsamı ve performans ölçümleri [doğrulama notlarında](docs/verification.md). İlk animasyon kullanımlarında kısa kare süresi sıçramaları görülebilir; ölçülen değerler bu bilgisayardaki Chrome çalıştırmasına aittir.

Doku atlasını değiştirirsen önce `npm run materials`, sonra `npm run build` çalıştır. Normal oyun açılışında test kancaları kapalıdır; yalnızca `?qa=1` adres parametresiyle açılırlar.

Görsel çalışma, istenen [Dream Loop](https://github.com/achimala/dream-loop) akışıyla yapıldı: mevcut görüntü → hedef görsel → oyun içi uygulama → bağımsız görsel inceleme. Superpowers kullanılmadı.
