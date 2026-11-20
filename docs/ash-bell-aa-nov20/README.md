# Ash Bell Manastırı’nın çan kulesi

Merdivendeki iki bakır kabartma, kurtarılmış meşe kirişe asılan bronz çanın motifini taşır. Çan odasında koyu demir bağlantılar, gerçek boşluğu olan çan, tokmak ve zeminde aşınmış pirinç kakma yer alır. Halat, odanın güney duvarındaki özgün E etkileşiminin yanında durur. Bu etkileşim çanı sallandırır ve oyunun asansörünü serbest bırakır.

- [Merdiven önce](stair-before.png) · [Merdiven sonra](stair-after.png) · [Merdiven DreamLoop hedefi](../../assets/monastery/ash-bell-approach-target.png)
- [Çan odası önce](chamber-before.png) · [Çan odası sonra](chamber-after.png) · [Çan DreamLoop hedefi](../../assets/monastery/ash-bell-target.png) · [Halat tarafı](lever.png)

Karşılaştırma kareleri oyunun kamerasından eş konumda çekildi. Bu karelerde silah, arayüz ve düşmanlar gizlendi. Çan, levhalar ve bağlantılar iki modelde toplam 5.670 üçgen kullanır. Her iki model için 12 doku örneği, aynı DreamLoop hedeflerinden tek 256×192 atlasa işlendi. Çan odası açısından çizim çağrısı 362’den 364’e çıktı. Işık nesnelerinin sayısı aynı kaldı.

Çevrimdışı Chrome testleri her iki sürümde de 17 W ve E girdisiyle şapel kapısından rampaya çıktı, halatı çekti, Bell Seal’ı aldı ve asansörle aşağı inip avlu kaydına ulaştı. Testte düşmanlar sabitlendi. V4’te duraklatınca çan durdu, devam edince hareket sürdü. Ölçülen salınım anında çanın en alt noktası duran kameranın 0,539 oyun birimi üzerindeydi.

9.600 çarpışma örneği ile harita, eşya, düşman, ışık ve kayıt noktası verileri eşleşti. Eski sürümde oluşturulan kayıt ve yeni sürümün kendi kaydı **Continue** ile çan mührünü, açılmış geçitleri ve asansörün serbest durumunu geri getirdi. Dört yeni kaynak üç ayrı bölüm geçişinde birer kez serbest bırakıldı. [Doğrulama](scope.json)

```powershell
node tools/ash-bell-chamber-tests.cjs previous.html THE-BLACK-SILENCE.html
node tools/compile-ash-bell-chamber.cjs
```
