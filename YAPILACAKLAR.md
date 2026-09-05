# Yapılacaklar

Bu web sürümü, mobil uygulamadan önceki geliştirme ve deneme aşamasıdır. Aşağıdaki
maddeler mobil uygulamaya taşınacak ürün kararlarıdır; web'de yalnızca
gerekli olanlar yapılır.

## Tamamlananlar (web)

- [x] Hasta kartı, işlem geçmişi, otomatik kontrol takvimi
- [x] Öncesi / sonrası fotoğraf galerisi ve karşılaştırma
- [x] Fotoğraf çekim tarihi EXIF'ten otomatik dolar
- [x] Ajanda liste ve aylık takvim görünümü
- [x] Yedek al / geri yükle (fotoğraflarla tek dosya)
- [x] Kalıcı depolama isteği ve riskli tarayıcı uyarıları
- [x] PIN kilidi (PBKDF2 ile saklanır, açılışta ve arka plandan dönüşte sorulur, deneme frenleme)
- [x] Tasarım sistemi v2 "Gece Laciverti" (TASARIM.md): token dosyası, tüm ekranlar yeniden yazıldı

## Mobil uygulama için öncelikli

1. **Kamera çekim rehberi.** Yüz ön / profil / oblik, burun bazal, gövde gibi standart
   pozlar için yarı saydam hayalet şablon; önceki fotoğrafın silüetiyle hizalama.
   Öncesi/sonrası karşılaştırmasının değerini belirleyen özellik.
2. **Biyometrik kilit.** Face ID / parmak izi ile açma; PIN yedek yöntem olarak kalır.
3. **Otomatik yedek.** iCloud / Google Drive'a zamanlanmış yedek; son yedek tarihinin
   Ayarlar'da görünmesi ve haftalık hatırlatma.
4. **Bulut eşitleme.** Hesap, sunucu, uçtan uca şifreleme; telefon, tablet ve
   bilgisayardan aynı veri. Cihaz kaybında veri kaybını bitirir. Ayrı proje ölçeği.
5. **Onam formları.** İşlem başına dijital onam, hasta imzası, PDF çıktı ve hastaya gönderim.
6. **Randevu hatırlatma.** SMS / WhatsApp ile hatırlatma; hekim müsaitlik takvimi;
   isteğe bağlı çevrimiçi randevu alma.
7. **Klinik kayıt derinliği.** İlaç ve alerji listesi, ameliyat notu şablonları,
   ölçüm ve implant kaydı, işlem başına fiyat/ödeme takibi.

## Tasarım (TASARIM.md §7 kalanlar)

- [ ] Ekran geçişinde iOS tarzı geri kayma (şu an yalnızca giriş animasyonu var)
- [ ] Butonlarda haptik geri bildirim (native'de)
- [ ] Karşılaştırma ekranında kaydırmalı (slider) mod

## Küçük iyileştirmeler

- [ ] HEIC dosyalarından EXIF okuma (web'de JPEG/WebP/PNG destekleniyor)
- [ ] Fotoğraf görüntüleyicide yakınlaştırma (pinch-zoom)
- [ ] Hasta listesinde son işleme göre sıralama ve filtre
- [ ] Yedek dosyasını şifreleme (PIN türevi anahtarla)
