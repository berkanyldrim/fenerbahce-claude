# Fenerbahçe teması — Claude Desktop

Sarı-lacivert bir Claude: gece stadyumu, projektörler, tribünde sarı-lacivert
kalabalık, sana doğru akan saha çizgileri; solda çubuklu formalı piksel bir
oyuncu, sağda piksel bir kanarya ve flama.

- **Renkler:** lacivert zemin, kanarya sarısı vurgu (koyu mod).
- **Kullanım kartı** (mesaj kutusunun üstünde): Bağlam, Önbellek, Oturum ve
  Hafta çubukları. Oturum ve Hafta'daki mavi çizgi, sürenin ne kadarının
  geçtiğini gösterir; dolu kısım çizgiyi geçtiyse limiti zamandan hızlı
  harcıyorsun demektir.
- **Alt bilgi satırı** (mesaj kutusunun altında): model ve efor, oturum
  süresi, maliyet, tur ve araç sayısı.

## Kurulum

Claude Code'da:

```
/plugin marketplace add berkanyldrim/fenerbahce-claude
/plugin install fenerbahce@fenerbahce
```

Desktop uygulamasında: **Ayarlar › Plugins** bölümünde
`berkanyldrim/fenerbahce-claude` pazar yerini ekle, sonra `fenerbahce`
eklentisini kur. Uygulamayı koyu moda al.

## Komutlar

| Komut | Ne yapar |
| --- | --- |
| `/fenerbahce canli` | Hareketli stadyum (varsayılan) |
| `/fenerbahce sabit` | Hareketsiz stadyum |
| `/fenerbahce kapat` | Temayı, kartı ve alt satırı kapatır |
| `/fenerbahce logo <yol>` | Kendi logo dosyanı sağ üste koyar |
| `/fenerbahce logo sil` | Logoyu kaldırır |

Seçimin oturumlar arasında saklanır.

### Logo

Bu depo hiçbir kulüp arması içermez; tüm çizimler özgündür. Kendi
bilgisayarında bir logo görmek istersen, küçük bir dosyayı (png, gif, jpg,
webp ya da svg, en fazla ~75 KB; piksel logo en iyisi) kendin seç:

```
/fenerbahce logo C:\Users\sen\Pictures\logo.png
```

Dosya yalnızca senin bilgisayarında saklanır, kimseyle paylaşılmaz.

## Notlar

- Tema Desktop ve mobil uygulamada görünür; terminal yalnızca kartı ve alt
  satırı metinle çizer.
- Önbellek süresi 1 saat varsayılır.
- Bu, resmi olmayan bir taraftar çalışmasıdır; Fenerbahçe Spor Kulübü ile
  bir bağı yoktur.

---

## English

An unofficial yellow-navy fan theme for Claude Desktop: a night stadium
backdrop with a pixel player in a striped kit and a pixel canary, usage bars
(context, cache, session, week) above the prompt and a stats line below it.
Install with `/plugin marketplace add berkanyldrim/fenerbahce-claude` and
`/plugin install fenerbahce@fenerbahce`. Commands: `/fenerbahce canli | sabit
| kapat | logo <path> | logo sil`. No club crest is included; all art is
original. MIT licensed.
