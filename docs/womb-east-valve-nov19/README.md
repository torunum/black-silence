# The Womb doğu geçidi

Kırmızı anahtara giden doğu geçidinin çevresine kemiksi damarlar ve koyu kökler eklendi. Yeni biçim, Gut odasının içinden yaklaşırken doğu kapısını ayırt etmeye yardımcı olur. Yerleşim motorun 8. bölümünde `(32, 28)` hücresine, dünya koordinatlarında `(65, 57)` noktasına bağlıdır.

[DreamLoop referansı](../../assets/womb/east-valve-dreamloop-target.png) · [Önce](before.png) · [Sonra](after.png)

Karşılaştırma, oyunun kamerasıyla aynı `(64.08, 2.2, 62.76)` noktasından alındı. Kabartmayı karşılaştırmak için silah, arayüz ve düşmanlar bu karelerde gizlendi. Kapı çevresi 1.742 üçgenli tek bir model ve bir doku kullanır. Yaklaşma karesinde bir ek çizim çağrısı ölçüldü.

Çevrimdışı Chrome testi Womb başlangıcından iki sürümde de merkez kaydına ulaştı, doğu kapısını E ile açtı ve W ile kırmızı anahtarı aldı. Yeni sürümde kapı ters yönden de açılıp geçildi. Test sırasında düşmanlar sabitlendi. Karşılaştırmada bölüm verileri ve 11.088 çarpışma örneği eşleşti. Modelin üç kaynağı iki ayrı bölüm geçişinde birer kez serbest bırakıldı. [Test kaydı](scope.json)

Yayımlanan dosyadaki ayrı koşuda, bölüm seçimiyle varsayılan ekipmandan başlandı. Doğu kapısı açıldı, kırmızı anahtar alındı, Heart yenildi ve zafer ekranından Enter ile başlığa dönüldü. [Oynanış kaydı ve zafer ekranı](native-win.md)

```powershell
node tools/womb-east-valve-tests.cjs THE-BLACK-SILENCE.html
```

Komut, karşılaştırma için geçit modelinin çıkarıldığı geçici bir oyun kopyası oluşturur. İkinci argüman olarak aynı haritayı içeren önceki bir HTML dosyası da verilebilir. Doku örnekleri `node tools/compile-womb-east-valve.cjs` ile yeniden oluşturulabilir.
