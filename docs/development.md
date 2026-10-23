# Sonraki geliştirmeler için

Bu teslimatın başlangıcı derlenmiş, kendi motorunu ve varlıklarını içeren tek HTML dosyasıydı. Asıl düzenleme yeri `src/`; `tools/build-game.cjs` bu dosyaları oyunun başlatma çağrılarından hemen önce ekler. Derleme sırasında önceki ekleme blokları çıkarılır. Aynı dosyayı tekrar derlemek eklemeleri çoğaltmaz.

23 Ekim devir paketinin ana HTML'si (`f923f85c2fe03649ba8e24871612dd531d385feb5cdeb3ea7cb8b10307c320bd`) yeni başlangıç olarak alındı. Bu dosya, önceki `9e0a2ac7…` teslimatı ve ayrı Village sunum bloğundan oluşur. İlk değişikliksiz derlemenin devir paketiyle bayt düzeyinde eşleştiği doğrulandı. Derleyici sırası **özgün motor → geliştirme bloğu → Village sunum bloğu → başlangıç çağrıları** olmalıdır; blokların yer değiştirmesi fonksiyon sarmalayıcılarının sırasını değiştirir.

## Modül sırası ve sorumluluklar

1. `materials.js`: doku atlasından çıkarılan küçük ton haritaları.
2. `combat.js`: özgün dövüş fonksiyonlarının sarmalayıcıları, geçici melee durumu ve isteğe bağlı QA arayüzü.
3. `enemy-animation.js`: gerçek hareket mesafesine bağlı yürüyüş, saldırı ve hasar tepkileri; yalnızca görsel pozlar.
4. `viewmodels.js`: silah geometrisi, tutuş/doldurma pozları, ortak el ve bot çizimleri.
5. `finishers.js`: bitiricilerin son el çizimleri ve yalnızca gerekli çizim çağrılarında etkinleşen optimizasyon.
6. `reload-audio-data.js`: lisanslı kayıtlardan kesilmiş, tek dosyada gömülü 16 bit PCM mekanizma örnekleri.
7. `reload-audio.js`: ilk iki silahın ortak animasyon zamanlarına bağlı doldurma sesleri; özgün effects ses yolu ve ses ayarları.
8. `prologue.js`: ilk haritanın dekor, eşya ve yönlendirmeleri; manastır mezar hücresi ve zindan galerisinin çarpışmasız mimari ayrıntıları.
9. `render-warmup.js`: yeni bölüm yüklendiğinde özgün yakın dövüş efektinin vertex-color Lambert shader'ını özel bir sahnede hazırlama.
10. `village-presentation.js`: devir paketinden değiştirilmeden alınan ayrı Village sunum bloğu; köyün sis/ışık dengesi, çatı/cephe ayrıntıları ve HUD sunumu.

İki modül aynı motor fonksiyonuna dokunuyorsa bu sıra önemlidir. Özellikle bitirici ellerinin son uygulaması `finishers.js` içindedir.

`npm run test:build`, kaynakların teslim HTML'siyle eşleşmesini, Village bloğunun devir paketiyle aynı kalmasını, özgün motor SHA-256 değerini ve iki ardışık derlemenin birebir aynı sonucu üretmesini kontrol eder. Eksik veya yinelenen blok işaretlerinin kaynak dosyaya yazılmadan reddedilmesi de geçici kopyalarda sınanır. Test için `.dream-loop/original.html` veya eski deney klasörleri gerekmez.

Koyu deri manşetler 27 numaralı malzeme yuvasını kullanır; palet `viewmodels.js` içinde tanımlanır ve `finishers.js` tarafından da kullanılır. Diğer silahların özgün mont malzemesi global olarak yeniden renklendirilmez.

23 Ekim referans el çizimi: ilk iki silahın sağ ve sol elleri `viewmodels.js` içinde gömülü iki PNG'den çözülür. Şeffaf pikseller silahın mevcut derinlik tamponuyla birleştirilir; ayrı bir HTML/CSS bindirmesi değildir. El pozu silahın dönüşümünü izler. Diğer silahlar, tekme/drop kick ve bitirici elleri kendi çizim yollarını korur. Ana referans ve üretim promptları `assets/hand-reference/` altındadır. Kaynak PNG değişirse gömülü veri de eşleştirilmeli ve çevrimdışı çözülme tekrar doğrulanmalıdır.

`npm run test:hands`, geçici bir HTML kopyasına inceleme yardımcısı ekleyerek iki elin yüklenmesini, 48 doldurma pozunu ve silah değişiminde iz kalmamasını denetler. Önceki sürümle 20 piksel eşliği denemesi için `node tools/grip-reference-tests.cjs THE-BLACK-SILENCE.html önceki-sürüm.html` kullanılabilir; önceki HTML verilmezse sürümler arası eşlik kontrolü açıkça atlanır. `npm run test:hand-extremes`, 168 uç poz ile normal/4 kat CPU yavaşlatmalı ilk kontrol edilebilir kareyi denetler. Bu süre giriş akışını da içerir; yalnızca PNG çözülme süresi değildir.

## Motor bağlantıları

| Bağlantı | Anlamı |
| --- | --- |
| `T`, `C`, `Ct`, `St` | Oyuncu/envanter, hareket, kamera/girdi ve silah animasyonu durumu |
| `v`, `J` | Aktif bölüm nesneleri ve render sahnesi |
| `Du`, `qr`, `B_` | Düşman oluşturma, hasar ve kritik can stagger kararı |
| `B$`, `v$` | Tekme başlatma ve silah/melee güncellemesi |
| `Rk`, `K_`, `H_`, `Kw` | Bitirici hedefi, başlangıcı, ilerlemesi ve temizliği |
| `pz`, `rp` | Dövüş durumunu sıfırlama ve bölüm yükleme |
| `gV[0/1/9].build`, `FJ` | Prologue, zindan ve manastır dekoru; prologue yerel ışık efektleri |
| `s0t`, `r0t` | Bitiricide sol/sağ el çizimi |
| `Ltt`, `V4` | Bot geometrisi ve tekme bacak pozları |
| `window.__BLACK_SILENCE_RELOAD_TIMING` | İlk iki silahın el/mekanizma hareketleri ile seslerin ortak dondurulmuş olay zamanları |

`combat.js` içindeki `balance` nesnesi can/stagger ayarlarını toplar. Bitirici vuruşları özgün motorun 0,32 / 0,56 / 0,82 saniyelik temaslarıyla eşleşir; el hareketini değiştirirken bu zamanlamayı da gözet.

## Korunması gereken davranışlar

- Bölüm yeniden yüklenirken geçici melee ve bitirici durumu temizlenmeli. Can artışı yeni düşman oluşturulurken bir kez uygulanmalı.
- Stagger her uygun düşmana yalnızca bir şans verir; ölümcül hasar düşmanı kurtarmamalı.
- Hızlı drop kick çarpışmaları süpürülerek denetlenir. Yalnızca son konumu kontrol etmek düşük FPS'de düşman veya ince duvardan geçişe yol açar.
- Geçici raster fonksiyonları `try/finally` ile geri alınır. Bir bitirici, sonraki silahın çizim yöntemlerini kalıcı olarak değiştirmemeli.
- Prologue eşyalarının sırası checkpoint kayıtlarının indeksleriyle ilişkilidir. Yeniden yüklemede harita üretimi tutarlı kalmalı.
- Prologue çıkış odası mezarlıkla aynı kuzey/güney satırlarını paylaşır; bağlamsal ipuçlarını yalnız `z` koordinatına göre seçme. Açılış yönlendirmeleri mezarlığın yatay sınırlarıyla da kısıtlanır.
- Yeni sahne dekorlarını açık zemine yerleştir. Özellikle arena çıkışındaki mumun duvar hücresine gömülmemesi ve dar köprü/merdiven hatlarının açık kalması test edilir.
- `blacksilence.save` v1 yalnızca ilerleme ve ayarları saklar. Checkpoint anlık durumu özgün motorun belleğindedir.

## İnceleme ve doğrulama

`?qa=1` ile açılan yerel oyunda `window.__BLACK_SILENCE_QA` dövüş, konum, harita ve raster durumunu gösterir. Normal açılış bu arayüzü oluşturmaz. Test araçları kullanıcının günlük Chrome profilini açmaz.

Yeni oynanış kodundan sonra `npm run build` ve ilgili test komutunu çalıştır. Görsel değişiklikleri gerçek oyun görüntüsüyle incele; tek başına geometri kodunun doğru olması siluetin ve temasın iyi göründüğünü kanıtlamaz. Sahneye düşman ekleyerek yapılan gösterim ile normal bölüm oynanışını raporlarken ayrı belirt.

Bu tur ölçülen raster optimizasyonu genel gerçek-kare karşılaştırmasında tutarlı kazanç sağlamadı ve teslim modüllerine alınmadı. `tools/performance-benchmark.cjs` iki ayrı HTML üzerinde sırayla A/B/B/A ölçümü yapabilen araştırma aracıdır. Yerel deney raporları `.dream-loop/performance-experiments/` altındadır; deneyin piksel eşitliği sonucu yayınlanmış oyunun hızlandığı anlamına gelmez.

`npm run test:navigation` varsayılan olarak derlenmiş `THE-BLACK-SILENCE.html` dosyasını okur; `src/` modüllerini yeniden eklemez. Test, motorun gerçek hareket ve etkileşim fonksiyonlarına erişen ayrı bir geçici çalışma kopyası üretir. Şapel ve ilk karşılaşmada düşman AI'sı çalışır; güzergâhın kalanı yalnız çarpışma, yükseklik ve çıkış etkileşimini ayırmak için AI durdurularak yürünür. Kamera konumunu ışınlayarak geçiş başarısı sayılmaz.

`.dream-loop/before-polish-5/THE-BLACK-SILENCE.html` bu son polish turundan önceki kesin geri dönüş dosyasıdır. Aynı klasördeki kaynak/araç/belge kopyaları çalışma anı snapshotıdır; o HTML'nin derlendiği kaynaklar oldukları iddia edilmez. `SNAPSHOT.json` ayrımı ve HTML SHA256 değerini kaydeder.

`docs/combat-preview.webm` son örnek kayıttır. `tools/capture-preview.cjs` yeni ham kaydı ve kesim başlangıcını `.dream-loop/video/capture.json` içine yazar; ilk açılış beklemesini keserek paylaşılacak videoyu hazırlayabilirsin. Durağan silah/sahne görüntüleri için mevcut konuşmanın tamamlanması beklenir; oyun altyazıları kapatılmaz.

Sesli video için capture aracı yalnız QA tarayıcısında gerçek WebAudio çıkışını MediaRecorder'a dallandırır. Ses seviyesi ve özgün effects/ambience karışımı korunur; bu kayıt kancası teslim HTML'sine eklenmez. Ham ses `game-output.webm` içindedir ve senkron işareti kaldırılırken başlar. Encoder'ın gerçek görüntüden hesapladığı kesim `.dream-loop/video/encoded.json` içindedir; capture dosyasındaki duvar saati tahmini kullanılmaz. Son videoda bu ses akışı birleştirilir. Ayrı `tools/render-reload-audit.cjs`, son HTML'deki örnek ve zamanlardan dinleme amaçlı WAV üretir; offline WAV tek başına gerçek zamanlı senkron kanıtı değildir.

`node tools/encode-preview.cjs`, açılışta kaydedilen ve paylaşılacak klipten tamamen kesilen renk işaretini bulur; ses, işaret kaldırıldığında başlar. Çıktı VP9 + Opus'tur. İşaret ile ilk temiz görüntü arasındaki çözünürlük 25 FPS videoda 40 ms'dir; fiziksel hoparlör/ekran gecikmesi ölçülmez. Windows dışındaki ffmpeg yolu için `FFMPEG_PATH` kullanılır.

Sahne referansı [Atari'nin resmi Blood görselleridir](https://atari.com/products/blood-refreshed-supply): bağlı taş kuşaklar, farklı yüzey bölgeleri ve sınırlı sıcak vurgu incelendi. Ticari görseller veya oyun varlıkları kopyalanmadı. Yeni taş bay'ler mevcut atlasları, su izleri ise kodla üretilmiş özgün küçük bir doku kullanır; dekorlar native static material batch'lerine katılır.
