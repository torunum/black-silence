# Gravedigger çağrı sesi

Gravedigger, düşman güncellemesinin ortasında yaratık çağırıyor. Yeni yaratığın hareket başlangıcı artık animasyon kaydı açılırken belirleniyor. Böylece yaratığın ilk pozu çizilebiliyor ve yara sesi sahnedeki gerçek konumundan çalıyor.

Sorunu `f6ac6d8` üzerinde iki canlı Ash Bell karşılaşmasında yeniden ürettik. Chrome, `spurtPulse` yara sesinde `PannerNode.positionX` değerini reddetti. Ölçüm, çağrılan zombinin ilk döngüdeki başlangıç konumu eksik olduğu için ekrandaki dönüşünün `NaN` olduğunu gösterdi. Zombi sonradan vurulunca yara sesi de bu dönüşü dünya konumuna çevirmeye çalıştı.

Tarayıcı testi, Gravedigger'ın ikinci evredeki çağrı sayacını hazırlayıp oyunun kendi çağırma ve isabet kodunu çalıştırıyor. İki yaratık türünde ilk pozu ve 24 güncelleme sonrasını karşılaştırdı. Her iki yara sesinin de dünya konumu ve panner çıkışındaki ses örnekleri doğrulandı. Bir sonraki bölümde çağrılan yaratıkların ve yara kaynaklarının temizlendiği de kontrol edildi. Aynı yavaş girdi temposuyla yapılan canlı aday koşusu 415 ses çağrısı ve 7 yara sesi boyunca tarayıcı ya da ses parametresi hatası vermedi. [Doğrulama kaydı](verification-data/nov19-gravedigger-audio.json)

Birleşik HTML’deki ayrı canlı koşu Gravedigger’ın ikinci evresine ve yaratık çağrısına ulaştı. 800 ses çağrısında tarayıcı veya ses parametresi hatası görülmedi. Bu koşudaki yedi yara sesi çağrıdan önce kaydedildi. Çağrının hemen sonrasında yeni yaratıkların vurulması, yukarıdaki iki vakalı testte sınandı.

Mevcut animasyon testi bitiriş pozunu ekrana hazırlanmadan önce okuyordu. Test artık animasyon süresi aynı kaldığında açının sabit durduğunu ve süre ilerlediğinde açının değiştiğini doğruluyor.

```sh
node tools/gravedigger-summon-audio-tests.cjs THE-BLACK-SILENCE.html previous.html
```

`previous.html` olarak `dd6cf26` sürümündeki bağımsız HTML kullanılabilir. Test raporu ve geçici tarayıcı dosyaları varsayılan olarak `.dream-loop/gravedigger-summon-audio` altında oluşturulur. [Birleşik HTML’nin A/B sonucu](verification-data/nov19-afternoon-release.json).
