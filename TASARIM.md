# Hasta Takip — Tasarım Sistemi v2 ("Gece Laciverti")

Bu dosya uygulamanın görsel dilini tanımlar. Repo köküne `TASARIM.md` olarak ekle ve her arayüz değişikliğinde referans al. Amaç: mevcut "şablon" görünümünden kurtulup sade, premium, klinik‑lüks bir his vermek. Uygulama şu an GitHub Pages'te PWA; ileride iOS uygulamasına dönüşecek, bu yüzden tüm değerler tek bir token dosyasından okunmalı.

## 1. İlkeler

1. Tek vurgu rengi: gece laciverti. Mavi, pembe, mor, yeşil, altın yok. Durum renkleri (hata/uyarı) sadece gerektiğinde ve az.
2. Kutu içinde kutu yok. Kenarlıklı kart yerine: ince ayırıcı çizgili listeler veya sadece boşlukla ayrılan bölümler.
3. Hiyerarşi tipografiyle kurulur, renkle değil. Başlık büyük ve sıkı, geri kalan sessiz.
4. Her ekranda tek dolu (primary) buton. Diğer aksiyonlar ikon veya metin buton.
5. Metnin başında dekoratif ikon yok (telefon, takvim, damla ikonları kaldırılır). İkon sadece aksiyon butonlarında ve tab bar'da.
6. Sayılar kutusuz gösterilir: büyük rakam + altında küçük gri etiket.
7. Boşluk cömert. Şüphede kalınca boşluğu artır, öğeyi küçültme.
8. Tutarlılık > her şey. Aynı yarıçap, aynı boşluk ritmi, aynı yazı boyutları her ekranda.

## 2. Renk token'ları

Tüm renkler `:root` içinde CSS değişkeni olarak tanımlanır; bileşenlerde hex kullanılmaz.

```css
:root {
  /* Zemin */
  --bg:            #F5F4F0;  /* sayfa zemini, kırık fildişi */
  --bg-elevated:   #FFFFFF;  /* sheet, modal */
  --bg-subtle:     #EAE8E1;  /* arama kutusu, ikincil buton zemini */
  --bg-inverse:    #0B1326;  /* hero alanı, primary buton, seçili öğeler */

  /* Metin (açık zemin üzerinde) */
  --text:          #0B1326;
  --text-secondary:#6B7185;
  --text-tertiary: #B0B3BC;  /* boş değer "—", placeholder */

  /* Metin (lacivert zemin üzerinde) */
  --text-on-inverse:           #F5F4F0;
  --text-on-inverse-secondary: #A9B0C2;
  --text-on-inverse-tertiary:  #8B93A8;
  --border-on-inverse:         #2A344D;

  /* Çizgiler */
  --hairline:      #E8E6DF;  /* liste ayırıcı */
  --divider:       #E1DFD8;  /* bölüm ayırıcı, tab alt çizgisi */

  /* Durum — az kullan */
  --danger:        #B3261E;
  --danger-bg:     #F9E7E5;
  --warning:       #8A5A00;
  --warning-bg:    #F7EBD3;

  /* Fotoğraf placeholder */
  --photo-placeholder: #C9C1B6;
}
```

Not: Öncesi/Sonrası etiketleri renkli badge olmayacak; fotoğrafın altında `--text-secondary` renginde düz metin ("Öncesi · 11 Ağu").

### 2.1 Karanlık mod

Tema sistem ayarını izler (`prefers-color-scheme`), Ayarlar > Görünüm'den Açık / Koyu / Sistem olarak ezilebilir. Aynı token adları, farklı değerler; bileşen kodu hiç değişmez.

```css
@media (prefers-color-scheme: dark) { :root, [data-theme="dark"] {
  --bg:            #111827;
  --bg-elevated:   #1A2234;
  --bg-subtle:     #1E2738;
  --bg-inverse:    #0B1326;  /* hero aynı kalır, gövdeden bir ton koyu */

  --text:          #F5F4F0;
  --text-secondary:#A9B0C2;
  --text-tertiary: #6B7185;

  --hairline:      #232B3D;
  --divider:       #2A344D;

  --danger:        #F28B82;
  --danger-bg:     #3A1F1E;
  --warning:       #E6B96A;
  --warning-bg:    #3A2E14;

  --photo-placeholder: #4A5063;
}}
```

Karanlıkta ters dönen şeyler:
- Primary buton: zemin `--text` (fildişi), metin `--bg-inverse`. Yani açıkta lacivert/fildişi, koyuda fildişi/lacivert. Bunu `--primary-bg` / `--primary-text` token çifti ile çöz, doğrudan `--bg-inverse` kullanma.
- "Yaklaşan kontrol" kartı: lacivert dolgu yerine `--bg-elevated` zemin + 1px `--divider` kenarlık.
- Fotoğraf karşılaştırma ekranı her iki modda da lacivert; tema değişmez.
- Hero ile gövde arasındaki fark koyuda azdır (#0B1326 / #111827); bu bilinçli, keskin geçiş istenmiyor.

## 3. Tipografi

Font: iOS'ta `-apple-system` (SF Pro), diğerlerinde `Inter` (Google Fonts'tan yükle, 400 ve 500 ağırlıkları yeter). Sadece iki ağırlık kullanılır: 400 ve 500. 600/700 yok.

| Rol | Boyut | Ağırlık | Harf aralığı | Kullanım |
|---|---|---|---|---|
| Display | 32px | 500 | -0.02em | Ekran başlığı (Hastalar), hasta adı |
| Stat | 24px | 500 | -0.02em | İstatistik sayıları |
| Title | 16px | 500 | 0 | Liste öğesi adı, bölüm başlığı |
| Body | 15px | 400 | 0 | Bilgi satırları |
| Body small | 14px | 400 | 0 | Meta bilgi, tab etiketi, buton |
| Caption | 13px | 400 | 0 | Liste alt satırı |
| Label | 12px | 400 | +0.06em | Bölüm etiketi ("Yaklaşan kontrol"), istatistik etiketi |

Kurallar: Cümle düzeni (sentence case), BÜYÜK HARF yok. Satır yüksekliği başlıklarda 1.1, gövdede 1.4. Meta bilgiler tek satırda " · " ile birleştirilir.

## 4. Boşluk ve yarıçap

- Grid: 4px tabanlı. Kullanılan adımlar: 4, 8, 12, 16, 20, 24.
- Ekran yatay kenar boşluğu: 24px (her ekranda aynı).
- Bölümler arası dikey boşluk: 24px. Bölüm başlığı ile içeriği arası: 10–12px.
- Liste satırı dikey padding: 14px, alt çizgi `--hairline` 1px.
- Yarıçap: buton ve input 14px, kart/fotoğraf 14–16px, avatar 50%, telefon çerçevesi ilgisiz.
- Gölge yok. Elevation sadece `--bg-elevated` rengiyle verilir.
- Dokunma hedefi minimum 44×44px.

## 5. Bileşenler

### Hero (hasta detay üst alanı)
- Zemin `--bg-inverse`, padding 20px 24px 24px. Ekranın üstünden safe-area dahil devam eder (status bar da lacivert).
- İçerik sırası: nav satırı (geri / düzenle / menü) → Label satırı ("Rinoplasti · 12 Ağu 2026", `--text-on-inverse-tertiary`) → Display hasta adı → meta satırı ("35 yaş · Kadın · A Rh+ · telefon", `--text-on-inverse-secondary`) → aksiyon satırı.
- Aksiyon satırı: 1 dolu buton (İşlem ekle, zemin `--text-on-inverse`, metin `--bg-inverse`, flex:1) + 3 ikon buton (Ara, Fotoğraf, Randevu; 46×44, 1px `--border-on-inverse` kenarlık, ikon 18px). Etiket yok, ikonlar yeterli. Uzun basınca tooltip/haptic.

### İstatistik satırı
- Hero'nun hemen altında, 22px üst boşluk. Üç öğe `justify-content: space-between`. Kutu, zemin, kenarlık yok.
- Sayı Stat stilinde, altında Caption etiket. Üçüncü öğe sağa hizalı ("12 Eyl" / "1. ay kontrolü · 7 gün").

### Tablar (Genel / İşlemler / Fotoğraflar / Randevular)
- Metin tab, 14px, seçili olan `--text` + 500 + 2px alt çizgi `--text`; diğerleri `--text-secondary`. Tüm satırın altında 1px `--divider`. Sayaç rozetleri kaldırılır (sayılar istatistik satırında zaten var).

### Bilgi listesi (Genel sekmesi)
- İki sütunlu satırlar: sol etiket `--text-secondary`, sağ değer `--text`. Boş değer "—" `--text-tertiary`. Satırlar `--hairline` ile ayrılır, son satırda çizgi yok. "Kişisel bilgiler" başlığı ve Düzenle butonu kaldırılır; düzenleme hero'daki kalem ikonundan yapılır.

### Fotoğraf ızgarası
- 2 sütun, 10px gap, kare‑yakın oran, 14px yarıçap. Etiket fotoğrafın altında Caption ("Öncesi · 11 Ağu"). Üstte badge yok.
- Fotoğraf karşılaştırma ekranı: tam ekran, zemin `--bg-inverse`, yan yana veya kaydırmalı; bu ekran uygulamanın vitrini, en çok özen buraya.

### Hasta listesi
- Üstte Display "Hastalar" + Caption alt satır ("3 kayıt · 1 yaklaşan kontrol"). Sağda 44×44 dolu (+) buton — "Yeni hasta" metin butonu kaldırılır.
- Arama: `--bg-subtle` zemin, kenarlık yok, 14px yarıçap, sol ikon.
- "Yaklaşan kontrol" bölümü: lacivert dolgu kart (tek istisna kart), 16px yarıçap, sol ad + işlem, sağ tarih + kalan gün. Yaklaşan kontrol yoksa bölüm gizlenir.
- Liste: alfabetik harf başlıkları kaldırılır (3–50 hasta için gereksiz). Satır: 42px gri avatar (`--bg-subtle`, baş harfler 500) + Title ad + Caption alt satır ("35 · Rinoplasti · 12 Ağu") + chevron `--text-tertiary`. Satırlar hairline ile ayrılır, kart kutusu yok.

### Tab bar
- 3 ikon, 22px, seçili `--text`, diğerleri `#A3A6AE`. Etiket metni kaldırılır (iOS kalıbı için isteğe bağlı 10px etiket eklenebilir ama tercih ikon‑only). Üstte 1px `--divider`. Safe-area alt boşluk.

### PIN ekranı
- Zemin `--bg-inverse`, tüm metin `--text-on-inverse`. Rakam tuşları kenarlıksız, 72px daire, zemin `#16213A`, basılıyken `#22304F`. Kilit ikonu kaldırılır; sadece "Hasta Takip" Display + Caption açıklama + 4 nokta + tuş takımı.

### Butonlar
- Primary: `--bg-inverse` zemin, `--text-on-inverse` metin, 14px yarıçap, 44–48px yükseklik, 14px/500 metin. Ekranda en fazla 1.
- Secondary: `--bg-subtle` zemin, `--text` metin.
- Ghost/ikon: zemin yok, 44×44.
- Destructive: sadece metin `--danger`, onay sheet'i içinde.

### Form ve sheet'ler
- Yeni hasta / işlem / randevu formları alt sheet olarak açılır (üstten kaydırılabilir), zemin `--bg-elevated`, 24px üst yarıçap.
- Input: `--bg-subtle` zemin, kenarlık yok, 14px yarıçap, 48px yükseklik, label input'un üstünde Caption. Focus: 1px `--text` kenarlık.

### Fotoğraf karşılaştırma
- Tam ekran, zemin `#0B1326`, her iki temada aynı. Üstte kapat (X) · "Karşılaştır" · paylaş.
- Fotoğraflar 3px aralıkla yan yana, ekran yüksekliğinin ~%60'ı. Sol altta Caption etiket ("Öncesi · 11 Ağu"), sağ üstte açı/dönem ("Profil", "2. hafta").
- Altta mod chip'leri: Yan yana / Kaydır (slider) / Üst üste (opaklık). Seçili chip fildişi dolgu.
- En altta seçili "Sonrası" fotoğrafı ve "Değiştir" metin butonu; dokununca aynı işlemin fotoğraf listesi sheet olarak açılır.
- Paylaş: iki fotoğrafı tek görsele birleştirip etiketleriyle dışa verir (hasta adı yazmaz).

### Alt sheet formları (Yeni hasta, İşlem ekle, Randevu)
- Arka plan `rgba(11,19,38,.45)` ile kararır. Sheet `--bg-elevated`, 24px üst yarıçap, 36×4 tutamaç.
- Başlık satırı: 20px/500 başlık solda, "Vazgeç" metin butonu sağda `--text-secondary`.
- Alan etiketi 12px `--text-secondary`, input'un üstünde. İsteğe bağlı alanlar etikette "· isteğe bağlı" (`--text-tertiary`).
- Input: `--bg-subtle`, 44px, 12px yarıçap, kenarlıksız. Odakta zemin `--bg-elevated` + 1px `--text` kenarlık. Placeholder `--text-tertiary`.
- Kısa seçimler (cinsiyet, tema) segment kontrol; çok seçenekli kısa listeler (işlem türü, kontrol dönemleri) chip grubu; uzun listeler (kan grubu) native seçici.
- Tarih alanı sağda takvim ikonu, seçince native date picker.
- Tek primary buton en altta, 46px, tam genişlik. Buton metni eylemi söyler: "Hastayı kaydet", "İşlemi kaydet".
- Klavye açılınca sheet yukarı kayar, buton görünür kalır.

### Boş durumlar
- Dikey ortalanmış: 16px/500 başlık (eylem cümlesi: "İlk hastanı ekle", "Henüz fotoğraf yok") + 13px `--text-secondary` bir cümle açıklama + tam genişlik primary buton.
- İllüstrasyon, ikon, emoji yok. Alt başlık listede "Henüz kayıt yok" olur.

### Silme onayı
- Alttan çıkan iOS action sheet: `--bg-elevated` kart, 18px yarıçap. Başlık "Elif Kaya silinsin mi?", açıklama neyin silineceğini sayar ve "Bu işlem geri alınamaz." ile biter.
- Yıkıcı aksiyon `--danger` renkli, 500 ağırlık, kartın içinde. "Vazgeç" ayrı kart olarak altta.
- `--danger` başka hiçbir yerde buton dolgusu olarak kullanılmaz.

### Ayarlar
- Bölüm etiketi Label stilinde, satırlar hairline ile ayrılır. Sağ tarafta değer + chevron (`--text-secondary`). Açıklama satırı sadece davranışı netleştirdiği yerlerde (PIN kilidi gibi).
- Görünüm bölümü en üstte: Tema segment kontrolü (Açık / Koyu / Sistem).

## 6. Hareket ve his

- Tüm geçişler 200–250ms, `cubic-bezier(0.2, 0.8, 0.2, 1)`. `prefers-reduced-motion` saygı gösterilir.
- Ekran geçişi: iOS tarzı sağdan kayma (PWA'da CSS ile, native'de sistem). 
- Butona basınca `transform: scale(0.98)`, 100ms.
- Liste yüklenirken skeleton (`--bg-subtle` bloklar), spinner yok.
- Boş durumlar: Display yerine Title başlık + bir cümle + tek primary buton. Örn. "Henüz fotoğraf yok" / "İlk öncesi fotoğrafını ekle" / [Fotoğraf ekle].
- Native'e geçişte: haptic feedback (primary aksiyon ve PIN tuşları), safe-area insets, status bar hero rengiyle aynı.

## 7. Uygulama sırası

1. Token dosyası (`tokens.css` veya tek bir `theme` objesi) oluştur, tüm hex'leri oradan oku.
2. Hasta detay ekranı — bu ekran tam kalitede yapılıp onaylanacak, sonra diğerleri.
3. Hasta listesi.
4. Fotoğraflar + karşılaştırma ekranı.
5. Randevular / ajanda.
6. PIN ekranı, ayarlar, formlar.
7. Skeleton, boş durumlar, geçiş animasyonları.

## 8. Yapılmayacaklar

- Gri kenarlıklı kartlar, kart içinde kart
- Pastel renkli avatarlar, renkli badge'ler
- Her metnin önünde ikon
- Birden fazla dolu buton
- Karanlıkta hero'yu gövdeyle aynı renge çekmek veya saf siyah zemin
- Boş durumlarda illüstrasyon/emoji
- 600+ font ağırlığı, BÜYÜK HARF etiket
- Gölge, gradient
- Alfabetik bölüm başlıkları (küçük listelerde)
- "Belirtilmedi" gibi uzun boş değer metinleri — sadece "—"
