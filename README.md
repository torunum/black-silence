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

24 Ekim güncellemesi silah görünümünü koruyarak çizim maliyetini azaltır; sabit geometri hesapları yeniden kullanılır ve üçgen dışında kalan pikseller daha erken atlanır. Ölüm sırasında devam eden doldurma sesleri durdurulur. Cehennemdeki beyaz alev konileri sıcak amber tonuna getirildi; bölüm malzemelerinin tekrar oluşturulması azaltıldı. [Çizim ölçümleri](docs/renderer-performance-2026-10-24.md), [ses düzeltmesi](docs/audio-lifecycle-2026-10-24.md) ve [son işlevsel kontroller](docs/oct24-final-functional-qa.md) ayrı kaydedilir.

On silahın görünümü ve tutuşu, örnek görsellerdeki metal, ahşap, kemik ve deri diliyle yenilendi. Silahlar kendi mekanizmalarını korur: tabanca ve çift namlulu tüfekte açılan hazne, diğer silahlarda şarjör, tambur, sürgü, kapak veya güç haznesi hareketleri bulunur. Eldivenler silahın ve doldurma parçalarının derinliğiyle birlikte çizilir. Cephane, ateş etme ve doldurmanın oyun kuralları korunur.

Prologue'un cehennem alanına koyu bazalt döşeme, kemerli mimari, bronz detaylar ve yeni yüzeyler eklendi. Geçiş ve oynanış çarpışmaları korunur. Kullanıcının devir paketindeki Village sunum bloğu değişmedi.

Önceki sürümün botları, tekme/drop kick, düşman savrulması, stagger ve E bitiricileri korunur. Doldurma sesleri gömülü kayıtlardan çalınır; kaynaklar ve lisanslar [ses kaynakları](docs/audio-sources.json) içindedir.

## Görüntüler ve doğrulama

[Gerçek doldurma videosu](docs/previews/arsenal-reload.webm) · [Tabanca](docs/previews/arsenal-pistol-idle.png) · [Nail](docs/previews/arsenal-nail-idle.png) · [Cehennem arenası](docs/previews/arsenal-hell-arena.png) · [Tüfek doldurma](docs/previews/arsenal-shotgun-reload.png)

Yukarıdaki silah görüntüleri ve video 23 Ekim teslimatındandır; silah pikselleri bu tur birebir korunmuştur. 24 Ekim bölüm ve farklı ekran oranı görüntüleri [son kontrol notlarında](docs/oct24-final-functional-qa.md) ve `docs/oct24-final-previews/` içindedir. Tasarım hedefleri `assets/weapon-reference/` ve `assets/hand-reference/` içindedir; hedef görseller oyun ekran görüntüsü değildir.

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

Teslim ZIP'i yalnız HTML, kaynaklar, görsel varlıklar, belgeler ve araçları içerir; `.git`, `.dream-loop`, bağımlılık klasörleri ve geçici dosyalar dahil edilmez. Tarihsiz `THE-BLACK-SILENCE-ARSENAL-HELL.zip` önceki 23 Ekim paketidir; 24 Ekim paketi tarihli adla ayrı tutulur. GitHub'daki ana HTML güncel kaynaklarla birlikte sürümlenir.
