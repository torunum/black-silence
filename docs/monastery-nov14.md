# Manastırın yıldız geçidi

Ash Bell Monastery’nin avlusundaki gök saati, kemerli geçidin hangi iki yöne açıldığını gösterir. Ay kadranı batıdaki gümüş çentiğe, yıldız kuzeydeki altın çentiğe oturunca demir kafes taş eşiğin içine iner. Kadrana bakıp **E** ile her basışta çeyrek tur çevirebilirsin. Doğru konumda çift baklava biçimli kilit işareti görünür, metalden daha uzun bir ses gelir.

Geçit kütüphaneye çıkar. İçerideki deri ciltli rafların arasında asılı gökküre, aynı mekânı ters yönden de tanımayı sağlar. Burada bir sır puanı kazanılır. Ana mühür kapısının iki mührü, bölüm sonu karşılaşması, çan ve asansör kendi bölüm kurallarını izler. Kayıt noktaları hem yarım bırakılmış konumları hem açılmış geçidi saklar.

## DreamLoop görsel çalışması

Eş kamerada avlunun kuzey duvarı, önceden ortasında bir meşale bulunan ve karşıda kütüphane olduğunu göstermeyen bir yüzeydi. Bu kareden sivri taş kemerli portal, iki kanatlı astronomi kadranı, soğuk metal yüzler ve sıcak bronz kenarlar istendi. Üst frizde ay/yıldız motifi, altında görünen, hareket edebilir bir demir kafes hedeflendi. [Önceki oyun karesi](monastery-nov14/before.png) · [Üretilen hedef](../assets/monastery/sidereal-target-v1.png)

İlk oyuniçi denemede kadraj ve oyma formu oturdu. İbreler uzaktan kayboluyor ve kadran kırık taş gibi açık görünüyordu. Son geçişte oyma atlasının renk uzayı düzeltildi, metal kadranlar koyu maviye çekildi, iki hareketli ibre büyütüldü. Hedefteki tanık işaretleri sabit bronz yuva ve gümüş çentikle somutlaştırıldı. Kafes, banko, duvar kalınlığı ve dönme milleri gerçek sahne geometrisidir. Özgün görselden cephe ve küçük oyma parçaları kesilerek tek palet atlasına alındı. [Kapalı geçit](monastery-nov14/closed.png) · [Çapraz görünüş](monastery-nov14/oblique.png)

Açılan kapının arkasında ilk denemede kütüphane ışığı zor seçiliyordu. Bir okuma feneri, kaburgalı tavan ve üç eksenli gökküre eklendi. Zemin üzerindeki dört aşınmış pirinç kakma, alçalan kafesin altından kütüphaneye doğru sıralanır. Raflardaki kitaplarda deri dokusu, yaldızlı sırt bantları ve farklı cilt boyları kullanıldı. [Açık geçit](monastery-nov14/opened.png) · [Kütüphane tarafından](monastery-nov14/library.png)

## Kontroller

Çevre adayında Chrome ve oyunun klavye girdisiyle ayarları yanlış yönde çevirmek, bir tam turdan sonra yeniden çözmek, iki sırayla çözmek ve aynı sır için puanı ikinci kez alamamak denendi. Bir kayıt noktasında yarı çözümle, diğerinde kapı açıkken ölüm ve dirilme oynatıldı. Oyuncu gerçek hareket ve çarpışma koduyla avludan kütüphaneye, ardından avluya yürüdü. Kapının iki yanındaki duvarlar kapalı, eski bölüm öğeleri ve mevcut altı sır yerindeydi. Yeni bölüm yüklenince çarklar başlangıç yönlerine döndü. Yakındaki düşman bitiricisi E önceliğini korudu.

Yeni öğelerde 25 mesh ve 4.122 üçgen sayıldı. Mevcut avlu meşalesi eşikten yana taşındı. Yeni geometrinin dinamik ışık sayısı sıfır. Bunlar geometrinin sayımlarıdır. Aynı kameradaki karşılaştırmalar sırasında tanıtım altyazısı gizlendi, sahnenin ışık ve sis değerleri oyun motorundan geldi. [Özel çevre adayı için doğrulama kaydı](monastery-nov14/verification.json)

Birleşik tek dosyayı doğrulamak için aşağıdaki komutu proje kökünde çalıştırabilirsin. Raporda kaynak modül, deneydeki çevre adayı ve çalıştırılan son tek dosya için ayrı SHA-256 alanları bulunur.

```sh
node tools/sidereal-passage-tests.cjs THE-BLACK-SILENCE.html .dream-loop/sidereal-check
```