# Hollow Village meydanı

Meydanın kuyusu ayrı modellenmiş taş sıraları, arduvaz örtü, paslı çıkrık, halat ve kovayla yeniden yapıldı. İğne yapraklı yamaç ile üzerindeki yıkık kule ve arkadaki mavi sırt farklı mesafelerdeki sabit dünya yüzeylerinde çiziliyor. Oyuncu yer değiştirirken yakın yamaç daha çok kayıyor. Köy duvarları ve çatıları görselleri örtebiliyor. İki katman gökyüzü bulunmayan iç mekânlarda kapatılıyor.

DreamLoop görsel hedefinden kuyu için yüzey örnekleri alındı. Aynı hedef üzerinden üretilen iki şeffaf sırt resmi ayrı derinliklerde, kenarları ve sis tonları işlenerek kullanıldı. Sırtlar köyün ayı, yıldızları, bölgesel sisi ve aydınlatmasıyla birlikte çiziliyor. Üç doku çevrimdışı oyun dosyasından yükleniyor.

- [Meydan, önce](square-before.png)
- [Meydan, sonra](square-after.png)
- [Kuyu, yakından](well-close.png)
- [Tarlaya geçişte manzara](field-mouth.png)

Meydanın iki görüntüsü dünya konumu `(71, 2.2, 12)` ve hedef `(71.2, 4.15, 34.2)` ile 1280×720 aynı görüşten alındı. Arayüz, eldeki silah ve düşmanlar bu görsel kontrolde gizlendi.

## Çevrimdışı doğrulama

Her sürümde gerçek bölüm girişinden başlayan 39 klavye adımıyla kuyunun yanından geçildi, ahırın kapısı açıldı, arka merdivenden çıkılarak kırmızı anahtar alındı ve mezarlık kapısı geçildi. Kayıt karşılaştırması anahtar eldeyken etkinleşen yol üzerindeki tapınaktan devam etmeyi kapsar. Test için bölüm doğrudan yüklenir ve düşmanlar yerlerinde tutulur. Hareket ile kapı etkileşimleri oyun girdilerini kullanır.

Önceki ve yeni sürümde 71.148 hareket örneği ve 2.535 atış çarpışması örneği aynı sonucu verdi. Dört metrelik yanal kamera hareketi uzak sırtı 9,89 piksel, ön yamacı 12,51 piksel kaydırdı. Ahırda iki sırt katmanı da gizlendi. Başka üç bölüme geçişin her birinde dokuz sahne kaynağı bir kez serbest bırakıldı. Chrome çevrimdışı çalıştı, HTTP isteği ve konsol hatası kaydetmedi.

Aynı meydan açısında birer kare 250→249 çizim çağrısı ve 125.428→130.588 üçgen gösterdi. 24 kare aralığının medyanı 17,6→17,2 ms oldu. Bu ölçümler tek makine ve oturumdan alındı. Kesin sürüm kimlikleri ile ölçüm koşulları `scope.json` dosyasında.

`node tools/hollow-village-square-tests.cjs <önce.html> <sonra.html> <kanıt-klasörü>`

Kaynak görsellerden gömülü dokuları yeniden üretmek için `node tools/compile-hollow-village.cjs` çalıştırılır.
