// src/api/index.ts

// Определяем базовый адрес (URL) для API.
// Если в окружении (файле .env) есть переменная VITE_API_URL — используем её.
// Если нет (например, при локальной разработке), оставляем пустую строку (""),
// и запросы пойдут на тот же домен, где запущено приложение.
const API_BASE = import.meta.env.VITE_API_URL || ""; // dev: "", prod: https://...

// Экспортируем асинхронную функцию getOutfitSimple,
// которая делает запрос к серверу и получает подборку одежды.
export async function getOutfitSimple(params: {
  userId: number; // id пользователя, по которому фильтруем аутфиты
  style: string; // стиль одежды (casual, classic, sport и т.д.)
  season: string; // сезон (summer, winter, etc.)
  limit?: number; // необязательный параметр — ограничение количества вещей
}) {
  // Создаём объект URLSearchParams — он превращает объект в строку query-параметров (?key=value)
  // Пример результата: "userId=1&style=casual&season=summer&limit=5"
  const q = new URLSearchParams({
    userId: String(params.userId), // конвертируем userId в строку
    style: params.style || "any", // если стиль не задан — подставляем "any"
    season: params.season || "all", // если сезон не задан — подставляем "all"
    ...(params.limit ? { limit: String(params.limit) } : {}), // добавляем limit, только если он указан
  });

  // Отправляем запрос на сервер, добавляя query-параметры к URL.
  // `${API_BASE}` — это адрес сервера (например, http://localhost:3000)
  // `/api/outfits/simple` — маршрут на сервере, который возвращает одежду
  // `?${q.toString()}` — подставляем строку параметров из объекта выше
  const res = await fetch(`${API_BASE}/api/outfits/simple?${q.toString()}`);

  // Проверяем, успешен ли ответ от сервера.
  // Если код ответа не 200 (OK), выбрасываем ошибку, чтобы можно было поймать её выше.
  if (!res.ok) throw new Error(`getOutfitSimple failed: ${res.status}`);

  // Если всё прошло успешно — парсим ответ как JSON и возвращаем данные (массив одежды).
  return res.json();
}
