# Zaisan High Land — Facebook Messenger Bot

Zaisan High Land luxury residence-ийн зориулсан **зөвхөн нэг төслийн** мэдээллийг өгдөг AI chatbot. Facebook Page-ийн Messenger дээр ажилладаг.

## Онцлог

- **Хэл:** Зөвхөн монгол хэлээр хариулна (хэрэглэгч ямар ч хэлээр асуусан)
- **Сэдэв:** Зөвхөн Zaisan High Land — өөр зар, өөр төсөл хэлэхгүй
- **AI:** Claude Opus 4.7
- **Зураг илгээдэг:** Барилгын гадна (`gadna*.jpg`), дотор (`dotor*.jpg`) зургийг хэрэгтэй үед өгдөг
- **Үнэ хэлэхгүй:** Үнийн талаар асуухад 8861-2088 утсаар чиглүүлдэг
- **Тогтмол welcome:** Анхны мессеж бичих үед (эсвэл "11" гэж бичих үед) тогтмол танилцуулга илгээнэ
- **Conversation logging:** Бүх ярилцлагыг Firestore `/conversations/{psid}` collection-д хадгална

## Локал хөгжүүлэлт

```bash
# 1. Сангуудаа суулга
npm install

# 2. .env файл үүсгэ
cp .env.example .env
# .env-ийг засаад бодит утгуудаа оруул

# 3. Локал ажиллуулах (tsx watch mode)
npm run dev

# 4. Туршихын тулд ngrok ашиглан webhook нээ
# (тусдаа терминал дээр)
ngrok http 8080
# Facebook → Webhooks → URL = https://<ngrok-id>.ngrok-free.app/webhook
```

## Production build

```bash
npm run build       # tsc + markdown файлуудыг dist/ руу хуулна
npm start           # node dist/server.js
```

## Render-д deploy хийх

1. **GitHub-руу push** хийгээд `khuygbaataro/Zaisan_Tusul` repo шинэчлэгдсэн байх ёстой.
2. **Render dashboard** → **"New +"** → **"Blueprint"**
3. Repo: `khuygbaataro/Zaisan_Tusul` сонгоно
4. Render `render.yaml`-г уншиж `zaisan-tusul-bot` service үүсгэнэ → **"Apply"**
5. Service үүссэний дараа **Environment** табд орж дараах секретүүдийг тавь:
   - `ANTHROPIC_API_KEY` — Anthropic console-аас
   - `FACEBOOK_PAGE_ACCESS_TOKEN` — FB Page-ээс үүсгэсэн token
   - `FACEBOOK_APP_SECRET` — FB App settings → Basic → App Secret
   - `FACEBOOK_VERIFY_TOKEN` — дурын string (доорх webhook setup-д хэрэгтэй)
   - `FIREBASE_SERVICE_ACCOUNT` — Firebase service account JSON (raw эсвэл base64)
6. Deploy дуустал хүлээгээд URL-ыг тэмдэглээрэй: `https://zaisan-tusul-bot.onrender.com`

### Liveness шалгах

```
GET https://zaisan-tusul-bot.onrender.com/
→ "Zaisan High Land chatbot is running."
```

### Зураг шалгах (deploy амжилттай эсэх)

```
https://zaisan-tusul-bot.onrender.com/public/gadna1.jpg
```
→ Барилгын гадна зураг гарвал бэлэн.

## Facebook Webhook тохиргоо

1. **developers.facebook.com** → таны App → **Messenger** → **Settings** → **Webhooks**
2. **Callback URL:** `https://zaisan-tusul-bot.onrender.com/webhook`
3. **Verify Token:** `.env` дотор тавьсан `FACEBOOK_VERIFY_TOKEN` (Render Environment-д тавьсантай ижил)
4. **Verify and Save** дарна
5. **Subscriptions:** `messages`, `messaging_postbacks` 2-ыг идэвхжүүлэх

## Файлын бүтэц

```
.
├── src/
│   ├── server.ts              ← Express + webhook + static photo serving
│   ├── claude.ts              ← Anthropic API call + tool loop
│   ├── tools.ts               ← show_photos tool + system prompt loader
│   ├── conversation.ts        ← In-memory history (PSID-р)
│   ├── conversationLog.ts     ← Firestore /conversations logging
│   ├── facebook.ts            ← FB Send API + signature verification
│   ├── firebaseAdmin.ts       ← Firebase Admin SDK init
│   ├── welcome.ts             ← Тогтмол welcome бичвэр
│   ├── knowledge/
│   │   └── zaisan-high-land.md  ← Бүх бодит мэдээлэл
│   └── prompts/
│       └── zaisan-system-prompt.md  ← Системийн prompt
├── public/                    ← Bot-ын өөрөө host хийдэг зургууд
│   ├── gadna1.jpg, gadna2.jpg, gadna4.jpg  (гадна)
│   └── dotor1.jpg, dotor2.jpg              (дотор)
├── scripts/
│   └── copy-assets.cjs        ← Build үед .md файлуудыг dist руу хуулна
├── package.json
├── tsconfig.json
├── render.yaml                ← Render Blueprint
├── .env.example
└── README.md
```

## Мэдлэгийн санг өөрчлөх

Bot-ын хэлж буй бүх мэдээлэл нь [src/knowledge/zaisan-high-land.md](src/knowledge/zaisan-high-land.md)-д байна. Энэ файлыг засаад деплой хийхэд bot шууд шинэ мэдээллийг өгдөг болно. Үнэ, ашиглалтад орох цаг, давхрын тоо зэргийг **энэ файлд** оруулна — кодыг өөрчлөх шаардлагагүй.

Системийн дүрэм (хэв маяг, мэндчилгээ дүрэм, зургийн tool-ийн заавар) нь [src/prompts/zaisan-system-prompt.md](src/prompts/zaisan-system-prompt.md)-д байна.
