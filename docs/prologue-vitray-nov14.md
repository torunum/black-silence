# Lav nefinin vitrayları

Prologue'un lav köprüsü, çapraz koridor ve ritüel arenasındaki üç apsisin her birine üç ayrı vitray oturur. Solda buhurdan taşıyan keşiş, ortada dikenli çan, sağda zinciri çeken kırmızı cüppeli figür bulunur. Merkezdeki geniş pencerenin yanları kıvrılan taş söveler, pirinç hat ve karanlık yuva ile çevrilidir. Camı çevreleyen kemerler özellikle yan açıdan kalınlık gösterir. [Özgün üç parçalı cam çalışması](../assets/hell/lancet-triptych-nov14.png) · [Dokuz panelden bir grubun önden görünüşü](prologue-vitray-nov14/transept.png)

DreamLoop'un ilk karşılaştırmasında amaç, uzaktan birbirine benzeyen üç turuncu şeride ayrı birer figür kazandırmaktı. İlk uygulama çanı yakında gösterdi, ancak figürler köprüden bakınca sis içinde koyu lekeler halinde birleşiyordu. İkinci aşamada pencerenin kendi ışığının sis davranışı düzeltildi. Son geçişte yalnız bal rengi açık camların geçirgenliği artırıldı, mürekkep ve metal gölgeleri korundu. Küçültülen pikseller için en yakın mip düzeyi seçildi. [Köprüden önce](prologue-vitray-nov14/bridge-before.png) · [Köprüden sonra](prologue-vitray-nov14/bridge-after.png) · [Batı sövesi](prologue-vitray-nov14/arena-side.png) · [Doğu sövesi](prologue-vitray-nov14/arena-east.png)

128 × 256 piksellik üç orijinal kesit, tek dosya içinde RGB565 olarak taşınıyor. Dokuz cam panosu bir geometri, bir materyal ve bir atlas paylaşır. Taş ve pirinç elemanlar mevcut dekor gruplarında çizilir. Altı eş kamera ölçümünde toplam çizim sayısına bir, üçgen sayısına 2.412 eklendi. Bunun 252 üçgeni bükülmüş cam yüzeylere aittir. Yeni dinamik ışık sayısı sıfır. Örnek karelerde kamera oyunun göz yüksekliğindedir. Eski önden karşılaştırma noktası meşale kaidesiyle örtüşür. Diğer beş bakışta oyuncunun yarıçapı için çarpışma temizliği ayrıca kontrol edildi.

Çevrelerin birleştirildiği adayda önceki harita tablosunun tamamı birebir eşleşti. Gerçek prologue testinde ilk düşman karşılaşması, silah alımı, 15 rota durağı ve merdivenden manastıra geçiş tamamlandı. Üç ayrı bölüm geçişinde atlas, materyal ve geometri birer kez temizlendi. Prologue'a dönüşte her seferinde taze kaynaklar kuruldu. Görsel testler doğrudan tek dosyadan alındı. Ana rota testinde ilk karşılaşmadan sonra çevre ve yürüyüş kontrolü izole edildi. [Vitray ölçümleri](prologue-vitray-nov14/verification.json) · [Yürüyüş sonuçları](prologue-vitray-nov14/navigation-results.json)

```sh
node tools/lancet-glass-tests.cjs THE-BLACK-SILENCE.html .dream-loop/verify-glass
node tools/prologue-navigation-test.cjs THE-BLACK-SILENCE.html .dream-loop/verify-route
```