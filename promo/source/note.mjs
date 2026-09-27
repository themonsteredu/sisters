import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
await p.goto('file://' + process.cwd() + '/note.html'); await p.evaluate(() => document.fonts.ready);
await p.screenshot({ path: 'notebook.jpg', type: 'jpeg', quality: 88 }); await b.close();
