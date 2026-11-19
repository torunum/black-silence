# Heart canlı dövüş doğrulaması

Son birleşik sürümde Heart yenildi ve oyunun **THE PARISH FALLS SILENT** zafer ekranı açıldı. Kazanan denemede oyuncu 88,4 can ve 32,8 zırhla hayatta kaldı. Oyun tamamlanan kampanya kaydını temizledi. [Zafer ekranı](native-victory.png)

| Ölçülen dövüş zamanı | Gözlem |
| --- | --- |
| Başlangıç | Heart 3000 canla birinci evredeydi. Oyuncunun 100 canı ve 100 zırhı vardı. |
| 6,958 sn | Heart 1920 canla ikinci evreye geçti. |
| 13,234 sn | Heart 930 canla üçüncü evreye geçti. |
| 20,924 sn | Heart’ın ölümü ilk kez gözlendi. O anda 17 atış ve 16 isabet kaydı vardı. |
| 23,161 sn | Zafer ekranı açıldı ve kampanya kaydı temizlendi. |

Oyuncu 17 kazık kullandı, arenada üç sağlık paketi, bir zırh paketi ve Soul Reaper mühimmatı aldı. Üç çağrılan düşmanın sprite yüksekliği ve dönüşü ilk gözlendikleri karede geçerliydi. Şok dalgası ve düşen enkaz uyarısı da çalıştı. Tarayıcı hatası görülmedi. Sonuç ekranında yüzde 94 isabet yazdı. Ayrı sonuç kartı testinde 19 atış ve 20 temas kaydı ekranda yüzde 100 gösterirken motorun ham sayıları 19 ve 20 kaldı.

Chrome, dondurulmuş sürümü normal dosya adresinden açtı. Dosyayı değiştirmeden menü öncesinde bir kez salt okunur Chrome gözlemcisi bağlandı ve **Continue** seçilmeden önce hata ayıklayıcı ayrıldı. Bu gözlemci, kontrol aracına yön ve zaman bilgisi verdi. **Continue** sonrasında kapı açma, hareket, nişan, ateş, şarjör doldurma, zıplama ve silah değiştirme gerçek tarayıcı girdileriyle yapıldı. Motor, tüm hareket ve hasarı kendi kurallarıyla hesapladı. İlk atıştan önce oyunun olağan doğuş koruması sona erdi.

Başlangıç kaydını oyun, bağımsız bir Womb hazırlık testinde shrine’a ulaşınca yazdı. Hazırlık, daha önce yürünmüş kampanya rotasında toplanan ekipmanı taşıdı ve Womb’da düşman saldırıları durdurulmuşken yerleştirilmiş anahtarı, silahları ve mühimmatı topladı. Önceki kampanya rotası, önceki bölümlerin boss’larında betikle bitirici hasar kullandı. Womb kaydında tüm düşmanlar canlıydı ve atış sayısı sıfırdı. Son sürümdeki ilk canlı deneme Heart’ın üçüncü evresinde ölümle bitti. İkinci deneme aynı kayıttan başlayıp Stake Gun ile zafer ekranına ulaştı. Bu doğrulama, hazırlanan kaydın yüklenmesinden zafer ekranına kadar oynanan canlı Heart dövüşünü kapsıyor.

| Oyun dosyası | Boyut | SHA-256 |
| --- | ---: | --- |
| Önceki yayımlanmış `dd6cf26` | 19.284.328 bayt | `b8363527cc897bd1a62ce54bbf4ddb937d52e5ebaf715ab29a82d46ba755165d` |
| Zafer ekranı alınan son birleşik sürüm | 19.291.204 bayt | `48ca6290ff2ce2d13f9d1d95f4d5759f09b77b38d086a532793c263e977dbbcd` |

## Varsayılan Womb başlangıcından zafer

Aynı `48ca6290` dosyasında **Chapter Select** ile Womb açıldı. Yeni tarayıcı profiline yalnızca bölüm kilidinin açılmış olduğu bilgisi aktarıldı. Oyun bölümü 100 can, sıfır zırh ve varsayılan tabancada 6 takılı, 60 yedek mermiyle başlattı. Salt okunur gözlemci menü öncesinde bağlandı. Hareket, nişan, kapılar, atışlar ve ikmal gerçek fare ve klavye girdileriyle yapıldı.

Oyuncu merkez shrine’ı etkinleştirdi, doğu kapısını açtı ve kırmızı anahtarı aldı. Silaha giderken bir kez öldü ve **Rise Again** ile oyunun ikinci shrine’ından döndü. Batı koridorundan anahtarı yeniden aldı, Stake Gun ve iki mühimmat kutusunu topladı, son shrine’ı etkinleştirdi ve arenanın kırmızı kapısını açtı.

Heart üç evrenin ardından öldü. Dövüş başlangıcından zafer ekranına 35,450 saniye geçti. Bu süre içinde 16 kazık ve bir tabanca atışıyla 17 isabet kaydedildi. Oyuncu 79,2 can ve 87,8 zırhla hayatta kaldı. Oyunun bölüm sonuç ekranı yüzde 100 isabet, bir ölüm ve 1:41 bölüm süresi gösterdi. Tarayıcı hatası görülmedi. [Varsayılan başlangıçtan zafer ekranı](stock-victory.png)
