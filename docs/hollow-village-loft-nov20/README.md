# Hollow Village ahır merdiveni

Kırmızı anahtara çıkan merdiven, ahırın doğu koridorunda dövme demir fener ve kısa bir meşe korkulukla belirginleşiyor. Fenerin hemen yanındaki duvar ile ilk üç basamağın ön kenarı sıcak bir yansıma alıyor. Bu vurgu basamaklar yükseldikçe azalıyor. Fener, korkuluk ve ışık yansıması sahnenin kendi üç boyutlu yüzeylerinde çiziliyor.

Gömülü doku, DreamLoop referansındaki demir, meşe ve cam yüzeylerinden derlendi. Işık yansıması zemin yüksekliği haritasına göre yerleştirildi. Fener ve korkuluk duvara sabitlendi.

- [Koridor yaklaşımı, önce](stair-before.png)
- [Koridor yaklaşımı, sonra](stair-after.png)
- [Basamakların yan görünüşü](stair-side.png)

Eşleşen görüntüler 1280×720 boyutunda ve oyuncu kamerası `(34.73, 2.2, 110.3)` konumundayken alındı. Bu görüntülerde arayüz, silah ve düşmanlar gizlendi.

## Çevrimdışı doğrulama

Test oyuncuyu doğal doğu koridoru yaklaşımına yerleştirir. Gerçek klavye girdileriyle merdiven çıkılır, saman yığınlarının arasından kırmızı anahtar alınır ve alt kata dönülür. Düşmanlar test boyunca yerlerinde tutulur.

Her sürümde 14 klavye adımıyla anahtara ulaşıldı ve dönüldü. 2.040 hareket ve zemin örneği ile 20.400 atış çizgisi örneği aynı sonuçları verdi. İki bölüm geçişinde beş ek çizim kaynağının her biri bir kez serbest bırakıldı. Aynı koridor açısında 2 çizim çağrısı ve 3.408 üçgen eklendi. Testte HTTP isteği ve konsol hatası kaydedilmedi.

`node tools/hollow-village-loft-tests.cjs <önce.html> <sonra.html> <kanıt-klasörü>`

Yüzey dokusunu yeniden üretmek için `node tools/compile-hollow-village-loft.cjs` çalıştırılır.
