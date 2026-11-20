# Ash Bell Monastery’ye varış

Prologue merdiveninden çıkınca Adem batı duvarındaki kapağın kapanışını duyar. Taşın arkasından gelen çan sesiyle kamera kuzeydeki mahzen kapısına döner. Kapının sol sövesindeki kabartma, manastırın ilerideki çanını ve kapıyı açan iki mührü haber verir. İki kısa Adem altyazısı tamamlanınca oyuncu mahzen kapısına dönük olarak kontrolü geri alır. [Oyun içi kare](arrival.png) · [Sesli sahne kaydı](arrival.webm)

Sahne `Space`, `Enter` veya sol tıklamayla atlanabilir. Klavyede `Tab`, atlama düğmesine odaklanır. Tarayıcının hareketi azaltma tercihi açıkken kamera son bakışta sabit kalır. Fare yakalaması bırakılırsa sahne duraklar ve **Resume** ile aynı noktadan devam eder. **Continue** ve **Chapter Select** normal bölüm başlangıcını kullanır.

Kabartma, DreamLoop hedefindeki bronz yüzeyden çıkarılan 71 × 64 piksellik dokuyu kullanır. Eğik kenarlı 63 üçgenlik model mevcut söveye eklenir. İzlenen ek sahne süresi kampanya ve bölüm sayaçlarına eklenmez. Denetim hem normal kare hızını hem de motorun 5 FPS’de hareket adımını sınırladığı koşulu kapsar. [Kabartma kaynak örneği](../../assets/ash-bell/arrival-medallion-source.png) · [Doğrulama kaydı](verification.json)

Tarayıcı testinde merdiven yaklaşma pozu hazırlandı. Merdiven, bölüm kartı ve mahzen kapısı için gerçek `E`, `Space` ve `W` girdileri kullanıldı. Duraklama kontrolünde tarayıcının fare yakalamasını bırakma olayı testle oluşturuldu ve oyunun **Resume** düğmesi normal tıklamayla kullanıldı. Sesli kayıt oyunun gerçek stereo WebAudio çıkışını taşır.

```powershell
node tools/ash-bell-arrival-clock.cjs
node tools/compile-ash-bell-medallion.cjs
```
