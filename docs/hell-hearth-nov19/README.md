# Cehennem arenasının köz ocağı

İkinci lav köprüsünün sonrasındaki arenanın ortasında sekiz yüzlü bir cenaze ocağı var. Koyu taş gövdenin yarıkları, ince bakır kuşak ve taş taban birbirinden ayrılıyor. Odun kütüklerinin uçları ve altı kızarırken farklı yüksekliklerdeki alevler birbirlerinin arasından çıkıyor. Zemindeki turuncu yansıma ateşle değişiyor. Arenanın yakınında duyulan mevcut çıtırtı artık ocaktan geliyor.

| Aynı oyun açısı, önce | Aynı oyun açısı, sonra |
| --- | --- |
| ![Önceki ocak](before-hero.png) | ![Yeni köz ocağı](after-hero.png) |

Silah ve arayüz çıkarılmış [önceki sahne](clean-before.png), [yeni sahne](clean-after.png) ve [ImageGen hedefi](../../assets/hell/arena-hearth-target-nov19.png) aynı cepheyi karşılaştırır. Üretilen çerçeveden alınan sekiz küçük taş, demir, bakır ve yanmış odun doku parçası 3B yüzeylerde kullanılıyor. Batıdan, [doğudan](after-east.png), [güneyden](after-south.png) ve [arena girişinden](after-entrance.png) gerçek kamera kareleri var.

## Doğrulama

Chrome, `ded3e465` karşısında arena ocağının etrafındaki 10.404 oyuncu, gövde ve mermi çarpışma örneğini karşılaştırdı. Geçiş grid'i ve yükseklikleri, kapılar, çıkış, eşya noktaları ve ocağın çarpışma kütlesi eşleşti. **W** oyuncuyu ocağın önünde durdurdu, **S** ile geri yürünebildi. Beş canlı karede ateş ve zemindeki ışık değişti. Duraklatınca iki etki de durdu. Arena dışına çıkınca alev çizimi kapandı. İki bölüm değişiminde izlenen dokular, materyaller ve geometriler birer kez serbest bırakıldı.

Bu testte dört eş açının çizim sayıları 67→67, 69→69, 223→226 ve 78→80 oldu. Karşılaştırma tarayıcısında hata kaydı yoktu. Görsel sahne karşılaştırması hareketli arka plan nesneleri içerir. [Sayısal sonuçlar](verification.json)

```sh
node tools/compile-hell-hearth.cjs --check
node tools/hell-hearth-tests.cjs previous.html THE-BLACK-SILENCE.html .dream-loop/hearth-check
```

`previous.html` için `ded3e465` sürümündeki HTML kullanılabilir. Yayın öncesi ocak denemesinin HTML SHA-256 değeri `cb2a30927e47428e480642670db5c2622ab45737c8aa2578e7f9ceffdfede167`. Kaynak SHA-256 değeri `453e641b4851ec77875c98086c522708d9f5c22cdef307bbb5205b1073dbbda5`.
