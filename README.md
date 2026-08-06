# Sisters

두 자녀를 포함한 여러 가족이 강좌·문제집 계획, 학습 증빙, 부모 검수, 영단어·암기 테스트와 보완학습을 한 흐름으로 관리하는 반응형 PWA입니다.

현재 저장소는 외부 계정 없이 전체 화면을 둘러볼 수 있는 데모 모드와, Supabase·AI·알림 공급자를 연결하는 production 구조를 함께 제공합니다.

## 구현된 범위

- 부모 이메일 매직링크, Google, Kakao 인증 어댑터
- 학생 전역 고유 아이디 + bcrypt 6자리 PIN, 5회 실패 잠금, HttpOnly 세션, 부모 PIN 초기화 시 세션 폐기
- 가족 단위 PostgreSQL 스키마와 RLS, 비공개 Storage, 감사로그
- 영어·수학·국어·과학·역사 기본 흐름과 사용자 과목 확장 구조
- 엠베스트 목차 붙여넣기 미리보기, 강좌·교재 목표, 월·주·일 자동배분
- 학생 오늘 할 일, 타이머, 메모, 사진 전처리·업로드, 증빙별 제출 조건
- AI 분석 후 부모 승인·반려, 재제출과 보완일 제안
- 영어 뜻·철자·듣기·말하기와 과목별 객관식·단답·빈칸·순서·서술·구두 테스트 구조
- 결정적 객관식/철자 채점, AI 서술 평가의 부모 검수 경계
- 자녀별 완료율·정시율·학습시간·점수·취약영역 리포트
- 앱 알림, 웹푸시, Resend 이메일, SOLAPI 알림톡 어댑터와 중복 방지 작업 큐
- 관리자 가족·작업 현황, AI 키 암호화 저장, 기능별 주/대체 모델 선택
- PortOne V2 보호자 본인확인 후 아동 개인정보·AI 처리 동의 기록
- 개인정보 내보내기·동의 철회·삭제 요청과 승인 제출물 원본 90일 보존 작업
- PWA manifest/service worker, 360px 모바일·태블릿·데스크톱 레이아웃

## 주요 화면

| 역할 | 경로 | 용도 |
| --- | --- | --- |
| 공통 | `/`, `/login` | 소개와 부모/학생 로그인 |
| 부모 | `/dashboard`, `/planning`, `/reviews`, `/tests`, `/reports` | 계획·검수·평가·통계 |
| 학생 | `/student`, `/student/tests`, `/student/progress` | 오늘 학습·테스트·기록 |
| 관리자 | `/admin`, `/admin/ai`, `/admin/families`, `/admin/notifications` | 운영과 AI/알림 설정 |
| 개인정보 | `/onboarding`, `/settings/privacy` | 보호자 동의와 데이터 권리 요청 |

## 데모 실행

```bash
npm install
copy .env.example .env.local
npm run dev
```

`.env.local`의 `NEXT_PUBLIC_DEMO_MODE=true`를 유지하면 외부 키 없이 사용할 수 있습니다.

- 부모: 로그인 화면의 `데모 계정으로 바로 둘러보기`
- 학생: `minseo` 또는 `jiwoo`, PIN `123456`
- 관리자: `/admin` (데모 모드에서만 자동 관리자 권한)

## Production 연결

1. Supabase 프로젝트를 만들고 `.env.example`의 URL·anon key·service role key를 설정합니다.
2. `supabase/migrations/202608060001_initial_schema.sql`을 적용합니다. 브라우저에 service role key를 노출하지 마세요.
3. Supabase Auth에서 이메일, Google, Kakao 공급자와 `/api/auth/callback` redirect URL을 설정합니다.
4. 최소 32자의 `STUDENT_SESSION_SECRET`과 base64 32바이트 `CREDENTIAL_ENCRYPTION_KEY`를 생성합니다.
5. `NEXT_PUBLIC_DEMO_MODE=false`로 바꾼 뒤 최초 운영자 profile의 `role`을 `admin`으로 지정합니다.
6. 운영자로 `/admin/ai`에 로그인해 OpenAI·Google 키와 기능별 모델을 저장합니다. 키는 AES-256-GCM으로 암호화되며 브라우저로 다시 반환되지 않습니다.
7. PortOne store/channel/API secret, Resend, VAPID, SOLAPI 값과 승인된 알림톡 템플릿을 필요에 따라 설정합니다.
8. Vercel에 `CRON_SECRET`을 설정합니다. Hobby 플랜 제한에 맞춰 `vercel.json`이 작업 큐를 매일 00:00 UTC(한국시간 09:00), 보존 삭제를 매일 03:15 UTC(한국시간 12:15)에 호출합니다.

환경변수의 OpenAI/Google 키는 초기 부트스트랩용 fallback입니다. 운영 중에는 관리자가 화면에서 공급자와 모델을 바꿀 수 있습니다. 기본 모델 목록에 없는 모델 ID도 직접 입력할 수 있습니다.

## AI 라우팅

`src/lib/ai/service.ts`가 다음 기능을 공통 인터페이스로 제공합니다.

- `parseCourseOutline`
- `generateStudyPlan`
- `analyzeSubmission`
- `generateTest`
- `gradeFreeResponse`
- `transcribeSpeech`

구조화 출력은 Zod로 검증합니다. 주 공급자는 한 번 재시도한 뒤 대체 공급자로 전환하며, 모두 실패하면 작업 상태를 `manual_review`로 보내 자동 승인하지 않습니다.

## 보안 설계

- 모든 가족 데이터에 `family_id` 적용 및 RLS 격리
- PIN hash·학생 세션·암호화 AI 키 테이블은 service role 전용
- 동일 출처 검사, 업로드 형식/10MB 제한, 비공개 버킷
- Storage 경로에 가족/학생/과제 ID 사용, 서명 URL 전제
- 관리자 화면과 API 이중 권한 검사
- 알림 `(notification_id, channel)` 유일키와 작업 점유로 재시도 중복 방지
- AI가 제출물이나 성취를 최종 승인하지 않는 부모 검수 경계

공개 베타 전에는 개인정보 처리방침·이용약관·AI 국외 처리/위탁 고지·만 14세 미만 동의 절차를 국내 법률 전문가와 최종 검토해야 합니다.

## 검증 명령

```bash
npm run typecheck
npm run test
npm run lint
npm run build
```

단위테스트는 목차 파싱, 휴일/요일/마감 충돌을 반영한 일정 배분, 결정적 채점, API 키 암복호화를 검증합니다.

## 배포

Vercel 프로젝트를 이 GitHub 저장소에 연결하고 위 환경변수를 등록한 뒤 배포합니다. 현재 로컬 저장소의 `origin`은 `https://github.com/themonsteredu/sisters.git`입니다.
