// Собирает games/index.json: список файлов игр, который читает сайт. Запускается в GitHub Actions перед деплоем.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const dir = "games", list = [];
for (const file of readdirSync(dir).filter(f => /\.json$/i.test(f) && f !== "index.json").sort()) {
  const text = readFileSync(`${dir}/${file}`, "utf8");
  let g;
  try { g = JSON.parse(text); } catch (e) { console.log(`::warning file=${dir}/${file}::Не JSON, пропускаю: ${e.message}`); continue; }
  if (g && g.format === "laserwar-game-export") { console.log(`::warning file=${dir}/${file}::Это сырой экспорт из приложения. Откройте на сайте «Добавить игру», выберите этот файл и загрузите сюда то, что сайт скачает.`); continue; }
  if (!g || !Array.isArray(g.players) || !Array.isArray(g.hits)) { console.log(`::warning file=${dir}/${file}::Не похоже на файл игры с сайта, пропускаю.`); continue; }
  list.push({ file, date: g.date || "", v: createHash("sha1").update(text).digest("hex").slice(0, 10) });
}
writeFileSync(`${dir}/index.json`, JSON.stringify(list, null, 1) + "\n");
console.log(`Игр в списке: ${list.length}`);
