const canvas = document.getElementById("avatarCanvas");
const ctx = canvas.getContext("2d");

// Загружаем аватар
const avatar = new Image();
avatar.src = "./images/models/body_hourglass.png"; // ← путь к твоему PNG аватара

// Загружаем одежду
const jeans = new Image();
jeans.src = "./images/bottoms/jeans_baggy_fall_blue.png"; // ← путь к джинсам
const topC = new Image();
topC.src = "./images/tops/ruffel_fall_cl.png"; // ← путь к кофте

// Когда всё загрузится, рисуем
Promise.all([
  new Promise((res) => (avatar.onload = res)),
  new Promise((res) => (jeans.onload = res)),
  new Promise((res) => (top.onload = res)),
]).then(() => {
  // 1. Очищаем холст
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 2. Рисуем тело
  ctx.drawImage(avatar, 50, 0, 300, 800);

  // 3. Рисуем одежду (можно подгонять позицию)
  ctx.drawImage(jeans, 80, 450, 250, 350);
  ctx.drawImage(top, 70, 300, 260, 200);
});
