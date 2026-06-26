/**
 * Rasm URL ni to'g'ri formatlash
 * Local rasmlar uchun server URL qo'shadi
 */
export const getImageUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  
  // Allaqachon to'liq URL (http/https)
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Local rasm - server base URL qo'shish
  // Vite proxy orqali ham ishlaydi, lekin fallback uchun
  if (url.startsWith('/uploads/')) {
    return `http://localhost:5000${url}`;
  }
  
  return url;
};
