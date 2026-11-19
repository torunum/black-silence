# Factory ofis geçidi

Pres salonundan ustabaşının ofisine çıkan tünelin yanındaki boruya, pirinç göstergeli döküm bir basınç düzeneği eklendi. Eskimiş bakır dirsekler, tırnaklı kapak ve emaye kadran Factory’nin koyu tuğlaları içinde yaklaşırken geçidi ayırt etmeye yardımcı olur.

[DreamLoop referansı](../../assets/factory/office-manifold-dreamloop-target.png) · [Önce](before.png) · [Sonra](after.png)

İki kare oyun içindeki aynı kamera açısından, dünya koordinatlarında `(83.5, 2.2, 69.96)` noktasından alındı. Silah, arayüz ve düşmanlar karşılaştırma karelerinde gizlendi. Düzenek 2.648 üçgenli tek bir model ve 160×80 boyutunda tek bir doku kullanır. Bu açıda çizim çağrısı 67’den 68’e çıktı.

Çevrimdışı Chrome testi, iki sürümde de Factory başlangıcından 22 W ve E girdisiyle yürüdü. Oyuncu pres salonundan doğuya dönüp ofisteki anahtarı aldı, kuzeydeki eritme geçidini açtı ve batıdaki döküm kapısından geçti. Düşmanlar bu güzergâh testinde sabitlendi. Bölüm verileri, ışık nesneleri ve 9.000 çarpışma örneği eşleşti. Düzenek kaynakları iki ayrı bölüm geçişinde birer kez serbest bırakıldı. [Test kaydı](scope.json)

Ayrı canlı koşuda oyuncu varsayılan ekipmanla başladı, düşmanlarla savaşırken ofis anahtarını aldı ve üç kapıyı geçerek döküm koridoruna ulaştı. [Canlı güzergâh ve oyun içi kare](native-route.md)

```powershell
node tools/factory-office-manifold-tests.cjs previous.html THE-BLACK-SILENCE.html
```

Doku örneklerini aynı DreamLoop referansından yeniden üretmek için `node tools/compile-factory-office-manifold.cjs` çalıştırılabilir.
