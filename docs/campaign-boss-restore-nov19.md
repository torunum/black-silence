# Kampanya kayıtları ve bölüm çıkışları

Ash Bell Monastery’de Gravedigger’ı yendikten sonra bir kayıt noktasına ulaş. **Continue** veya ölümden sonra **Rise Again** ile dönünce manastır çıkışı açık kalır. Abandoned Church’te Priest yenilmişse önceki çıkış ve ışığı geri gelir. Geçişi tamamlamak için Cathedral Guardian’ı da yenmen gerekir.

Womb of Silence’ta Heart of Silence öldükten sonra kayıt noktasına ulaşmışsan **Continue** ana oyunun zafer ekranını açar. Açılmış kırmızı kapının eşiğinde kaydedilen konum, oyuncu kapıya ve komşu duvarlara sığıyorsa geri yüklenir. Bu kayıtlarla oyuncunun konumu, toplam öldürme sayısı ve kazanılmış anahtar geri gelir.

## Tarayıcı doğrulaması

Chrome’da ilk kayıtlar `b8b77ff` sürümünün yerel HTML’sinde gerçek **E** ve **W** girdileriyle alındı. Ardından aynı dosya adresine yeni HTML kondu ve tarayıcıdaki kayıt **Continue** ile açıldı. Ayrıca **Space** ile yerel yeniden doğuş ve bölüm kartından geçiş kullanıldı. Senaryolar bilinen konumlarda başlar ve çevredeki düşmanlar sabitlenir. Patronların son darbeleri test tarafından hazırlanır, gerçek hasar ve ölüm kodu çalışır. Kapalı kapı ve komşu duvara taşan konum için iki ayrı kayıt varyantı denendi.

Yayımlanan HTML’de sekiz patron kayıt senaryosu, 12 kampanya regresyonu ve normal giriş kontrolleri çalıştırıldı. [Tam dosya ve senaryo sonuçları](verification-data/nov19-campaign-boss-restore.json)

```powershell
node tools/campaign-boss-restore-tests.cjs previous.html THE-BLACK-SILENCE.html .dream-loop/boss-proof.json
node tools/campaign-continue-tests.cjs
```

`previous.html` için `b8b77ff` commit’indeki `THE-BLACK-SILENCE.html` dosyasını kullan.
