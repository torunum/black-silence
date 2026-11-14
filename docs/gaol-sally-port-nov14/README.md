# Gardiyanın mazgalı

The Gothic Dungeon’da kırmızı anahtarın bulunduğu mahzen ile işkencecinin odası artık ortak bir duvarı paylaşıyor. Anahtar tarafındaki kırmızımsı, çatlamış meşe takozunu tekmele veya vur. Takoz parçalanınca sağdaki ağırlık iner, makara döner ve çift traversli demir parmaklık yükselir. Parmaklığın altında yeterli açıklık oluştuğunda iki yönde de yürüyebilirsin. Bu keşif bir sır puanı kazandırır. İşkencecinin odasından önce yaklaşırsan **E**, takozun anahtar mahzenine baktığını söyler.

Geçidi kullanırsan hücre bloğuna geri dönmeden ana salona ulaşırsın. Kırmızı anahtar cephaneliğin sürgüsünü açar. Guardian ve iki kayıt şapeli eski konumlarındadır.

## Görsel çalışma

Önce gerçek mahzeni anahtar odasından çektik. Bu karedeki mumun arkasına, iki kat taş kemerli, zincirli bir ortaçağ mazgalı çizildi. Taşların alın yüzü, kilit taşı rölyefi, paslı demir ve çatlak kereste dokuları bu çizimden örneklenerek modelin yüzlerine işlendi. Parmaklığın aralıklarından karşıdaki gerçek odayı görürsün. İçerideki anahtar askılığı ve arka kemerin yanındaki çetele, dönüş yolunu işaretler. [Önce](before.png) · [DreamLoop hedefi](../../assets/dungeon/gaoler-sally-port-v1.png) · [Oyunda kapalı](closed.png) · [Oyunda açık](open.png)

İlk oyuniçi karşılaştırmada kapı duvar için küçük kaldı. İki omuz genişletildi, basamaklı saçak yükseltildi ve eski düz alevin yerine demir ayaklı bir ateş haznesi oturtuldu. Sonraki geçişte kayaya soğuk gölgeli bir yüz, makaraya açık aşınma çizgisi, yere seyrek mum ışığı ve çubukların dibine yükselişle kaybolan temas gölgeleri eklendi. Karşılaştırma karelerinde kamera ve oyuncunun taşıdığı ışık aynı noktada. [Ceza odasından görünüş](prison-side.png)

## Oynanış ve kayıt

Chrome testinde fareyle takozu vurmak ve tekmelemek, ters taraftan zorlamak, geçit yükselirken duraklatmak ve gerçek **W** girdisiyle iki yönde yürümek denendi. Açıklıktan hem tabanca atışı hem kazık geçerken demir dikmeler, travers ve taş söve ikisini de durdurdu. Yeni parçalar 13 mesh, 13.241 üçgen ve sıfır dinamik ışık kullandı. Bölüm değişince izlenen 18 geometri, materyal ve doku kaynağının tamamı serbest bırakıldı. [Doğrulama](verification.json)

Önceki tek dosyalı sürümdeki bir kayıt şapelinde alınan kayıt aynı çevrimdışı adreste **Continue** ile açıldı. Keşfedilmiş 219 harita hücresinin değişmeyen 216’sı korundu. Üç yeni geçit hücresi oyuncu onları görene kadar gizli kaldı. Eski 13 kırılabilir nesnenin indeksleri, cephane, zırh, can, kırmızı anahtar ve oyuncu konumu korundu. Yeni geçit açılıp ikinci şapelde kayıt alındıktan sonra iki ayrı **Continue**, açık mazgalı, kazanılmış sır puanını, oyuncunun konumunu ve keşfettiği 330 hücreyi yükledi. [Kampanya aktarımı](campaign-upgrade.json)

Kök dizinden aşağıdaki iki komut, son oyunu ve önceki sürümden alınmış tek dosyalı oyunu karşılaştırır. `previous.html` için `c781a4b` sürümünün `THE-BLACK-SILENCE.html` dosyasını kullan.

```sh
node tools/dungeon-sally-port-tests.cjs THE-BLACK-SILENCE.html .dream-loop/sally-check previous.html
node tools/dungeon-campaign-upgrade-tests.cjs previous.html THE-BLACK-SILENCE.html .dream-loop/sally-check
```
