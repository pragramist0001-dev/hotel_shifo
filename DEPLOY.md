# 🚀 Render.com'ga Deploy Qilish Yo'riqnomasi

## Tuzatilgan muammolar

1. ✅ **CORS** - bir nechta origin qo'llab-quvvatlash (vergul bilan)
2. ✅ **Vite config** - `VITE_API_URL` env var orqali API URL
3. ✅ **SPA routing** - `public/_redirects` fayli (page refresh da 404 yo'q)
4. ✅ **Server .gitignore** - `node_modules`, `dist`, `uploads` ignore
5. ✅ **render.yaml** - avtomatik deploy konfiguratsiyasi

---

## 1. GitHub'ga Push Qiling

```bash
git add .
git commit -m "Fix: Render deploy configuration"
git push origin main
```

---

## 2. Render'da Yangi Service Yarating

### Backend (Web Service)
| Setting | Value |
|---------|-------|
| **Repository** | GitHub repo |
| **Root Directory** | `server` |
| **Runtime** | Node |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |

#### Backend Environment Variables:
```
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://...your-atlas-uri...
JWT_SECRET=your-super-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=7d
CLIENT_URL=https://your-client-name.onrender.com
```

> **Cloudinary (ixtiyoriy lekin tavsiya etiladi):**
> Render'da local `uploads/` papkasi har restart'da tozalanadi!
> Rasmlar saqlanishi uchun Cloudinary sozlang:
> ```
> CLOUDINARY_CLOUD_NAME=your-cloud-name
> CLOUDINARY_API_KEY=your-api-key
> CLOUDINARY_API_SECRET=your-api-secret
> ```

---

### Frontend (Static Site)
| Setting | Value |
|---------|-------|
| **Repository** | GitHub repo |
| **Root Directory** | `client` |
| **Build Command** | `npm install && npm run build` |
| **Publish Directory** | `dist` |

#### Frontend Environment Variables:
```
VITE_API_URL=https://your-server-name.onrender.com/api
```

---

## 3. Deploy tartib

1. **Backend'ni birinchi deploy qiling** va URL'ini oling (masalan: `https://sanatory-crm-server.onrender.com`)
2. **Frontend'ni deploy qiling** va URL'ini oling (masalan: `https://sanatory-crm-client.onrender.com`)
3. **Backend'ga qaytib** `CLIENT_URL` ni frontend URL'i bilan yangilang
4. Backend'ni **Redeploy** qiling

---

## 4. Muhim Eslatmalar

### 📁 Rasm yuklash (Local Uploads)
Render **free tier**'da fayl tizimi restart'da tozalanadi. Shuning uchun:
- **Cloudinary** credentials'ini sozlang (tavsiya etiladi)
- Yoki **Render Disk** (`paid`) xizmatidan foydalaning

### 💤 Render Free Tier Uyquga ketishi
Free tier 15 daqiqa faolsizlikdan keyin server uyquga ketadi.  
Birinchi request 30-60 soniyaga kechikishi mumkin.

### 🔒 JWT Secret
Production'da kuchli secret key ishlating:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Local Development

```bash
# Terminal 1 - Server
cd server
npm run dev

# Terminal 2 - Client
cd client
npm run dev
```
