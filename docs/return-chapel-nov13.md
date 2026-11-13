# Prologue dönüş şapeli ve su basmış kemiklik

Oyuncu lav alanından çıkınca taş kaburgalı bir koridordan geçer. Yan sığınakta duvara bağlanmış bir sedye ve ilaç şişeleri, mevcut sağlık ve mühimmatın neden burada olduğunu anlatır. Sığınağın kuzey ağzında önceden de çalışan mum kayıt noktası korunur. Son odanın taş yolu gerçek girişten merdivene kıvrılır; iki duvar kandili ve taş portal, orijinal tırmanılabilir merdiveni işaretler. Silah, kamera ve tırmanış geçişi bu çevre modülünce değişmez.

Gothic Dungeon'ın undercroft odasında küçük bir su sızıntısı ve eşikteki aşınma, zaten var olan gizli kemikliğin izini verir. İki gizli oda, düşmanlar ve ödüller aynı kalır. [Kapalı kapının yaklaşım görünüşü](return-chapel-nov13/dungeon-clue.png).

## Görsel geliştirme

[Referans görsel](../assets/hell/return-chapel-target-v1.png) aynı oyuncu bakışındaki [orijinal oyun karesinden](return-chapel-nov13/chapel-before.png) üretildi. Hedef: okunur, serin ışıklı merdiven; onu çerçeveleyen oyma kemer; iki sıcak ışık, yanlarda sessiz mezar nişleri ve yaklaşımı bağlayan yıpranmış döşeme. [Şapelin oyun içi görünüşü](return-chapel-nov13/chapel-after.png), [merdiven](return-chapel-nov13/ladder-after.png), [sığınak](return-chapel-nov13/refuge-after.png).

İlk taslaktaki iki aydınlık vitray, çıkıştan daha baskın oldukları için kaldırıldı. Bir sonraki taslakta kapı hücresinin dekor koruması kemeri saklıyordu; iki kanat kendi yan duvarlarına oturtuldu. Düz ve parlak döşeme, gerçek yürüyüş yönüne kıvrılan ve girişe doğru kararan taşlara dönüştü. Sütun kabartması ve taş sandukanın ön yüzünde yalnızca hedef görselden kesilmiş iki küçük parça kullanılır; pano veya arka plan görüntüsü yoktur. `node tools/compile-return-reliefs.cjs` bu parçaları üretir. Oyun ağ bağlantısı veya harici resim yüklemeden açılır. Referans, oynanabilir oyunun ekran görüntüsü değildir; oyundaki ışıklar ve nişler daha sade kalır.

## Kontroller

- Dört sabit, gerçek göz hizasındaki kamera; yerel bölge ışığı ve aynı silah. [Önceki ölçüm](return-chapel-nov13/baseline.json) ve [şapel adayı](return-chapel-nov13/chapel-world-candidate.json): harita hücreleri ve bölge dizileri aynı, 11.102 çarpışma/yükseklik örneği birebir aynı, çıkış konumu ve yönü `[107,16,0,1]`. Yeni noktasal ışık veya oyun döngüsünde yeni çizim hesabı yok. Geometri ve malzeme kullanımı artar; bu bir FPS ölçümü değildir.
- [Kemiklik deneyi](return-chapel-nov13/dungeon-secret.json): kontrol kamerası eşiğin yaklaşık dört metre önünde. Eylem mesafesinde **E** ile gerçek kapı açılır, gizli oda sayısı yalnız bir kez 0/2'den 1/2'ye çıkar. Ardından yerel hareketle eşikten içeri yürünür, orijinal sağlık kiti alınır ve sağlık 50'den 75'e çıkar. İkinci E sayacı artırmaz; JavaScript hatası yoktur.
- PNG ve raporlar çevrenin kendi adaylarından alındı, nihai birleşik oyunmuş gibi etiketlenmedi. Şapel adayının SHA-256 değeri `e51a2269…`; yalnızca sonraki bölümün ipucu da eklenince çevre adayı `111a13b2…`. Her iki durumda da el ve silah taban sürümdendir. Yeni bir boş çıktı diziniyle birleşik HTML üzerinde tekrarlanabilir:

```text
node tools/return-chapel-capture.cjs THE-BLACK-SILENCE.html .dream-loop/my-chapel-check
node tools/drowned-ossuary-test.cjs THE-BLACK-SILENCE.html .dream-loop/my-dungeon-check
```
