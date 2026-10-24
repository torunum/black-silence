# Doğrulama — 24 Ekim 2026

Dosya: `THE-BLACK-SILENCE.html`, **22.638.198 bayt**. SHA256: `41f9646703cce0a5da5b6b063df10bf60de84c9c821ffb5f65255ce0a6443448`.

Bu tur onaylanan silah/el görünümünü koruyarak çizim işini azaltır, ölümde devam eden doldurma sesini durdurur ve cehennem alevleriyle malzeme yaşam döngüsünü iyileştirir. Motor, Village sunumu, silah istatistikleri, botlar ve bitiriciler korunur.

## Son dosyada test edilenler

| Kontrol | Kanıt ve kapsam |
| --- | --- |
| Derleme | Canlı kaynaklar gömülü metinlerle birebir; iki tekrar build aynı dosya. Sekiz bozuk marker girdisi yazılmadan reddedilir. Motor ve Village SHA korunur. |
| Piksel eşitliği | Önceki teslimatla 594 silah/animasyon/geçiş/tekme/bitirici durumunda ham RGBA ve canvas birebir. Ayrıca 1.800 dejenere/ekran dışı/alpha/derinlik compositor vakası birebir. |
| On silah | Gerçek R/RAF doldurma, cephane, ateş, geçiş, tekme/iptal ve çizim kalıntısı kontrolleri. |
| Ekran ayarları | Üç ekran oranı ve iki native çözünürlükte 36 poz; iki gerçek doldurma sırasında yeniden boyutlandırma/ayar değişimi. Soul cache geri dönüşünde piksel eşitliği. |
| Ses | 49 yaşam döngüsü kontrolü, ilk iki silahın gerçek R/RAF ses zaman çizelgeleri ve native ölümden sonra ses durması. |
| Bölüm | 15 hareket noktası, gerçek E çıkışı, sonraki bölümde malzeme temizliği, dönüşte kararlılık ve cehennemde 20 silah pozu. |

Raporlar `verification-data/oct24-final-41f96467-*.json`, `renderer-20261024-*.json` ve `audio-lifecycle-2026-10-24-*.json` içindedir. Önceki `arsenal-final-5c071b18-*` raporları tarihsel teslimata aittir; yeniden koşulmuş gibi sunulmaz. Testler tam kampanya oynanışı veya tüm hataların bulunmuş olduğu anlamına gelmez.

## Performans

Son seri ABBA önceki **5c071b18** teslimatıyla aynı bilgisayarda, bölüm 0 başlangıç kamerasında, gerçek klavye R ve RAF üzerinden karşılaştırıldı. Bütün turlar korunur; tablo doldurma karelerinin havuzlanmış sonuçlarıdır.

| Silah | Çizim CPU önce → yeni | RAF FPS önce → yeni | Kare p95 önce → yeni |
| --- | --- | --- | --- |
| Çift namlulu | 18,60 → 14,22 ms | 43,50 → 53,94 | 36,10 → 18,20 ms |
| Nail | 12,53 → 11,38 ms | 54,18 → 55,16 | 18,20 → 18,20 ms |
| Soul | 15,57 → 13,52 ms | 51,83 → 55,79 | 35,60 → 18,10 ms |
| TNT | 12,37 → 11,37 ms | 53,12 → 55,16 | 35,10 → 18,20 ms |
| Stake | 9,29 → 10,92 ms | 55,86 → 50,86 | 18,10 → 36,10 ms |

Stake'in ilk yeni turunda FPS 46,11, ikinci turunda 55,82 ölçüldü; bu kuyruk havuzlanmış sonucu kötüleştirir ve saklanmamıştır. Stake için ardından değişmeyen aynı dosyalarla yapılan dar ABBA tekrarında sıcak CPU 9,96 → 8,80 ms, FPS 54,88 → 55,93 ve kare p95 18,2 → 18,1 ms ölçüldü; önceki kuyruk tekrarlanmadı. Bu tekrar ayrı raw/summary raporuyla korunur; ilk tabloyu değiştirmez. Soul için ayrı dengeli sıcak tekrar CPU 14,61 → 13,68 ms, FPS 54,24 → 55,61 ve aynı 18,2 ms p95 verdi. Dolayısıyla iyileşme ölçülüdür; her silahta/her sahnede akıcılığın tamamen çözüldüğü veya sabit FPS garanti edildiği iddia edilmez. Cehennem arenasının tamamı için bir FPS ölçümü değildir. [Yöntem ve seçim](renderer-performance-2026-10-24.md).

## Görsel yöntem ve medya

Silahlar gerçek hacimli arka/yan yüzeylere ve hareketli parçalara bağlı perspektifli resim yüzeyleri kullanır; tam serbest açılı 3B varlık değildir. Bazı yüzey ışıkları resimde sabittir. Cehennem mimarisinin statik ışıkları dinamik namlu parlamasına tepki vermez; normal karakter/nesne ışıkları korunur.

24 Ekim gerçek bölüm ve ekran oranı görüntüleri [son işlevsel kontrol notlarında](oct24-final-functional-qa.md) listelenir. `docs/previews/arsenal-reload.webm` ve eski silah görüntüleri **23 Ekim 5c071b18** teslimatından korunmuştur; yeni çekim gibi etiketlenmez. Silah piksellerinin eşitliği bu tur ayrıca doğrulanmıştır. Tasarım hedefleri `assets/` içinde ayrı tutulur.

Tarihsiz `dist/THE-BLACK-SILENCE-ARSENAL-HELL.zip` eski 23 Ekim paketidir. Yeni paket tarihli ayrı dosyaya yazılır; ZIP içindeki HTML hash'i ana dosyayla karşılaştırılır.
