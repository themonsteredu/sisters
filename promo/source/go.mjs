import { session, record, BASE } from './rec.mjs';
const w = ms => new Promise(r => setTimeout(r, ms));
const which = process.argv[2];
await session(async p => {
  const open = async path => { await p.goto(BASE + path, { waitUntil: 'networkidle' }); await w(1200); };
  if (which === 'landing') {
    await open('/');
    await record(p, 'landing', async () => { await w(2500); await p.mouse.wheel(0, 520); await w(3500); });
  }
  if (which === 'plan') {
    await open('/planning');
    await record(p, 'plan', async () => {
      await w(1200);
      await p.getByLabel('계획 설명').click(); await w(300);
      await p.getByLabel('계획 설명').pressSequentially('지우 수학 개념원리 80쪽 10/5~10/23 월수금 하루 5쪽', { delay: 75 }); await w(2200);
      await p.getByRole('button', { name: /확인하고 만들기/ }).click(); await w(4000);
    });
  }
  if (which === 'student') {
    await open('/student');
    await record(p, 'student', async () => {
      await w(1800);
      await p.locator('button[aria-label$="시작"]').first().click(); await w(1500);
      await p.getByRole('button', { name: '타이머 시작' }).click();
      await w(1200);
      await p.locator('input[type=file]').setInputFiles('notebook.jpg'); await w(1800);
      await p.getByPlaceholder('어려웠던 문제나 기억할 내용을 적어보세요.').pressSequentially('호흡과 광합성 비교가 헷갈려서 다시 정리했어요.', { delay: 70 }); await w(2500);
    });
  }
  if (which === 'review') {
    await open('/reviews');
    await record(p, 'review', async () => {
      await w(2500);
      await p.mouse.wheel(0, 420); await w(900);
      await p.getByPlaceholder('잘한 점이나 다시 확인할 부분을 적어주세요.').pressSequentially('풀이 과정 깔끔해요! 91쪽 7번만 내일 다시 풀어보자 👍', { delay: 65 }); await w(1200);
      await p.getByRole('button', { name: /학습 승인/ }).hover(); await w(600);
      await p.getByRole('button', { name: /학습 승인/ }).click(); await w(3000);
    });
  }
  if (which === 'test') {
    await open('/student/tests');
    await record(p, 'test', async () => {
      await w(1500);
      const input = p.getByPlaceholder('답을 입력하세요');
      await input.pressSequentially('achieve', { delay: 110 }); await w(700);
      await p.getByRole('button', { name: /다음/ }).click(); await w(1500);
      await p.getByText('특징', { exact: true }).click(); await w(900);
      await p.getByRole('button', { name: /다음/ }).click(); await w(2200);
    });
  }
  if (which === 'report') {
    await open('/dashboard');
    await record(p, 'dashboard', async () => { await w(4500); });
    await open('/reports');
    await record(p, 'report', async () => { await w(4500); });
  }
});
