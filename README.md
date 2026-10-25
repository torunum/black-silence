# The Black Silence

Gotik piksel FPS oyununun on silah, deri eldiven ve prologue cehennem bölümü güncellemesi.

## Oyna

`THE-BLACK-SILENCE.html` dosyasını Chrome veya Edge ile aç. İnternet bağlantısı ve kurulum gerekmez. Ses ve fare kontrolü için oyun alanına tıkla. Eski kayıtlarını kullanmak için aynı tarayıcı ve dosya/adres konumunu kullan; `file://` ile yerel sunucunun kayıt alanları farklıdır.

| Eylem | Kontrol |
| --- | --- |
| Hareket | W A S D |
| Koş | Shift |
| Ateş | Sol fare |
| Doldur | R |
| Tekme | Sağ fare |
| Drop kick | Yerde yeterli ileri hızla koşarken sağ fare |
| Etkileşim / sendeleyen düşmanı bitir | E |
| Silah değiştir | Oyunun silah seçme kontrolleri |

## Bu sürüm

Stake doldurmanın erken taşıma aşamasında sol elin kazıktan ayrılması düzeltildi; sağ el de normal duruş, ateş ve doldurma boyunca kabzaya oturtuldu. Bitirici animasyonlarının eldivenleri mevcut koyu deri renkleriyle uyumlu hale getirildi. Kol koparma bitiricisinde elde tutulan kol artık aynı anda dünyaya ikinci bir parça olarak fırlamaz; normal bitişte bırakılır, ölüm veya bölüm değişiminde bekleyen parça iptal edilir. [Temas ve eldiven kontrolleri](docs/stake-contact-oct25.md).

Şapelin kırık vitrayına mevcut renkleri, delikleri ve silueti koruyan yüzey kırıkları ve ton farkları eklendi. Tek ortak küçük doku kullanılır; geometri veya yeni ışık eklenmez. [Eşleşmiş görüntüler ve kaynak temizliği](docs/chapel-glass-oct25.md).

Tommy, Sniper ve Nail doldururken tambur/şarjör/kap ile yükleme elinin ekranın altına kaybolması düzeltildi. Yükleme hareketi boyunca bütün silah ve eller birlikte daha görünür konuma gelir; Tommy tamburunun çıkarma yolu da kısaltıldı. Geç kapama/kol çekme, cephane, süreler ve diğer silahlar korunur. [Gerçek doldurma görüntüleri ve kontroller](docs/reload-framing-oct24d.md).

Önceki turda Rifle doldururken şarjör ve sol elin ekranın altına kaybolması düzeltildi. Silah, şarjör ve el birlikte daha görünür bir konuma gelir; temas ilişkisi, cephane ve doldurma süresi korunur. [Gerçek doldurma videosu ve doğrulama](docs/rifle-reload-oct24c.md).

Önceki ortam rötuşunda cehennem arenasındaki iki ritüel direğinin açık renk başlıkları ve kaburgaları eskimiş kemik dokusu, kaideleri mevcut bazalt malzemesi kazandı. Lav akışlarında küçük bir yatay doku değişimi düz şerit görünümünü hafifçe kırıyor. Yerleşim, ışıklar, geometri ve zırh alımı korunur. [Eşleşmiş görüntüler ve kapsam](docs/ritual-ivory-oct24c.md).

Önceki animasyon turunda Sniper'ın eli kaldırılan sürgüyle birlikte döner; Soul'un doldurma sırasında sönen ve yenilenen enerjisi keskin parlaklık sıçraması yapmaz. Bazı doldurma pozlarında ekranda kesilen kol uçları, mevcut deri yüzeyi ve derinlik ilişkisi korunarak devam ettirildi. Silah ve eldiven tasarımı korunur. [Silah hareketleri ve kanıtları](docs/weapon-animation-oct24b.md).

Tekmeyle savrulup hayatta kalan düşmanlar uçuşta mevcut darbe alma karelerini kullanır ve yere temas ettikten sonra kısa bir görsel toparlanma gösterir. Bu hareket ek stun, hasar veya çarpışma değişikliği değildir. [Düşman inişi ve doğrulaması](docs/enemy-landing-oct24.md).

Önceki 24 Ekim turunun çizim optimizasyonu, ölümde doldurma sesini durdurma ve amber cehennem alevleri korunur. [Önceki çizim ölçümleri](docs/renderer-performance-2026-10-24.md) bu son animasyon turunun yeni FPS ölçümü değildir. [Ses düzeltmesi](docs/audio-lifecycle-2026-10-24.md) ayrıca belgelenir.

On silahın görünümü ve tutuşu, örnek görsellerdeki metal, ahşap, kemik ve deri diliyle yenilendi. Silahlar kendi mekanizmalarını korur: tabanca ve çift namlulu tüfekte açılan hazne, diğer silahlarda şarjör, tambur, sürgü, kapak veya güç haznesi hareketleri bulunur. Eldivenler silahın ve doldurma parçalarının derinliğiyle birlikte çizilir. Cephane, ateş etme ve doldurmanın oyun kuralları korunur.

Prologue'un cehennem alanına koyu bazalt döşeme, kemerli mimari, bronz detaylar ve yeni yüzeyler eklendi. Geçiş ve oynanış çarpışmaları korunur. Kullanıcının devir paketindeki Village sunum bloğu değişmedi.

Önceki sürümün botları, tekme/drop kick, düşman savrulması, stagger ve E bitiricileri korunur. Doldurma sesleri gömülü kayıtlardan çalınır; kaynaklar ve lisanslar [ses kaynakları](docs/audio-sources.json) içindedir.

## Görüntüler ve doğrulama

[Gerçek doldurma videosu](docs/previews/arsenal-reload.webm) · [Tabanca](docs/previews/arsenal-pistol-idle.png) · [Nail](docs/previews/arsenal-nail-idle.png) · [Cehennem arenası](docs/previews/arsenal-hell-arena.png) · [Tüfek doldurma](docs/previews/arsenal-shotgun-reload.png)

Yukarıdaki silah görüntüleri ve video 23 Ekim teslimatındandır. Son animasyon kanıtları `docs/weapon-animation-oct24b/` ve `docs/enemy-landing-oct24/` içindedir; her kaydın kaynak sürümü kendi doğrulama notlarında belirtilir. Bölüm düzeni korunur; son materyal karşılaştırmaları `docs/ritual-ivory-oct24c/` içindedir. [Düzeltilmiş native kamera/ışık kontrolü](docs/hell-environment.md) ve `docs/hell-capture-oct24/` mevcut ortamı gösterir. Tasarım hedefleri `assets/weapon-reference/` ve `assets/hand-reference/` içindedir; hedef görseller oyun ekran görüntüsü değildir.

Son dosyanın hashleri, test kapsamı ve ölçüm sınırları [doğrulama notlarında](docs/verification.md) ve [build bilgisinde](docs/build-info.json) yer alır.

Silahların bir bölümü tam serbest açılı 3B model yerine, gerçek hacim ve hareketli parçalara bağlanan perspektifli resim yüzeyleri kullanır. Bu yöntem onaylanan birinci şahıs açısına göre hazırlanmıştır; her açıdan aynı ayrıntıyı sunan tam 3B model değildir. Bazı silah yüzeylerinde referansın ışık bilgisi resmin içinde bulunur. Cehennem ayrıntılarının bazı ışık vurguları da sabittir. Performans cihaz, tarayıcı ve sahneye göre değişir; tüm koşullarda sabit FPS garantisi yoktur.

## Kaynak ve derleme

Motor tek HTML içinde korunur. Düzenlenebilir eklemeler `src/`, gömülen görsel kaynaklar `assets/`, derleme ve doğrulama araçları `tools/` içindedir.

```sh
npm ci
npm run build
npm run test:build
```

`tools/build-game.cjs` modülleri mevcut motorun önüne yerleştirir; aynı kaynaklarla tekrar derleme aynı HTML'yi üretir. `src/viewmodels.js` tüm on silahı ve el/bot çizimini, `src/prologue.js` bölüm ayrıntılarını, `src/reload-audio.js` doldurma seslerini içerir. Diğer test komutları `package.json` içindedir. Yerel sunucu tercih edilirse `npm start` kullanılabilir; tek HTML'yi açmak için sunucu gerekmez.

Teslim ZIP'i yalnız HTML, kaynaklar, görsel varlıklar, belgeler ve araçları içerir; `.git`, `.dream-loop`, bağımlılık klasörleri ve geçici dosyalar dahil edilmez. Son paket `THE-BLACK-SILENCE-2026-10-24-RELOADS.zip` adıyla ayrı tutulur; önceki ZIP'ler değiştirilmez. GitHub'daki ana HTML güncel kaynaklarla birlikte sürümlenir.
