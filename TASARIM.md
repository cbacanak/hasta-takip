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
- 600+ font ağırlığı, BÜYÜK HARF etiket
- Gölge, gradient
- Alfabetik bölüm başlıkları (küçük listelerde)
- "Belirtilmedi" gibi uzun boş değer metinleri — sadece "—"
