import { chromium } from 'playwright';
import fs from 'node:fs';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await p.goto('file://' + process.cwd() + '/compose.html');
await p.evaluate(() => document.fonts.ready);
const total = await p.evaluate(() => window.TOTAL);
const mode = process.argv[2];
if (mode === 'test') {
  fs.mkdirSync('shots', { recursive: true });
  for (const t of process.argv.slice(3).map(Number)) { await p.evaluate(t => window.render(t), t); await p.screenshot({ path: `shots/c-${t}.jpg`, quality: 80, type: 'jpeg' }); }
} else {
  // 사용법: node render.mjs            (전체)
  //         node render.mjs part 0 4   (4개로 나눠 병렬 렌더할 때 0번 조각)
  fs.mkdirSync('out', { recursive: true });
  const n = Math.round(total * 30);
  const [k, parts] = mode === 'part' ? [Number(process.argv[3]), Number(process.argv[4])] : [0, 1];
  const lo = Math.floor(n * k / parts), hi = Math.floor(n * (k + 1) / parts);
  for (let i = lo; i < hi; i++) {
    await p.evaluate(t => window.render(t), i / 30);
    await p.screenshot({ path: `out/${String(i).padStart(5,'0')}.jpg`, type: 'jpeg', quality: 95 });
    if (i % 150 === 0) console.log(i, '/', n);
  }
}
console.log('total', total);
await b.close();
