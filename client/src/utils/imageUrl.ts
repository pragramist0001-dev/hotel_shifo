/**
 * Rasm URL ni to'g'ri formatlash
 * Local rasmlar uchun server URL qo'shadi
 */
export const getImageUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  
  // Normalize backslashes to forward slashes for Windows compatibility
  let normalizedUrl = url.replace(/\\/g, '/');

  // Allaqachon to'liq URL (http/https)
  if (normalizedUrl.startsWith('http://') || normalizedUrl.startsWith('https://')) {
    return normalizedUrl;
  }
  
  // Local rasm - server base URL qo'shish
  // Vite proxy orqali ham ishlaydi, lekin fallback uchun
  if (!normalizedUrl.startsWith('/')) {
    normalizedUrl = '/' + normalizedUrl;
  }

  if (normalizedUrl.startsWith('/uploads/')) {
    const serverUrl = (import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api')).replace('/api', '');
    return `${serverUrl}${normalizedUrl}`;
  }
  
  return normalizedUrl;
};
