# Sisters

두 자녀를 포함한 여러 가족이 강좌·문제집 계획, 학습 증빙, 부모 검수, 영단어·암기 테스트와 보완학습을 한 흐름으로 관리하는 반응형 PWA입니다.

현재 저장소는 외부 계정 없이 전체 화면을 둘러볼 수 있는 데모 모드와, Supabase·AI·알림 공급자를 연결하는 production 구조를 함께 제공합니다.

## 구현 상태

> 이 문서는 **실제로 동작하는 것만** "구현된 범위"에 둡니다. 데모 모드에서만 보이는 화면과 아직 배선되지 않은 흐름은 아래 "로드맵"에 있습니다.

### 구현된 범위 (운영 모드에서 동작)

- 부모 이메일·비밀번호 로그인, Google·Kakao OAuth 어댑터(API 배선 완료, 로그인 화면 버튼은 미노출)
- 학생 전역 고유 아이디 + bcrypt 6자리 PIN, 5회 실패 잠금, HttpOnly 세션, 부모 PIN 초기화 시 세션 폐기
- 관리자 PIN 로그인과 PIN 변경 시 기존 세션 무효화
- 가족 단위 PostgreSQL 스키마와 RLS, 비공개 Storage, 감사로그 테이블
- 가족 온보딩: 가족·학생·PIN·기본 과목(영어·수학·국어·과학·역사) 생성
- PortOne V2 보호자 본인확인 후 아동 개인정보·AI 처리 동의 기록
- AI 키 AES-256-GCM 암호화 저장, 기능별 주/대체 공급자·모델 선택
- 개인정보 내보내기·동의 철회·삭제 요청 접수
- **강좌·문제집 등록과 학습계획 발행**: 목차 붙여넣기 → 회차 자동 분리 → 강좌 저장, 기간·요일·휴일·하루 최대량을 반영한 과제 자동배분 → 계획 발행(한 트랜잭션으로 계획+과제+버전 스냅샷 기록)
- **학생 제출과 부모 검수**: 타이머·메모·사진 첨부 → 제출물·첨부 레코드 생성 및 과제 상태 전이 → 부모 승인/반려 → 반려 시 다음 학습 가능일에 보완 과제 자동 배정
- **승인 제출물 원본 90일 보존 작업**: 첨부마다 `delete_after`를 기록하고 보존 크론이 만료분을 배치로 삭제
- **테스트 작성·공개·응시·서버 채점**: 부모가 문항을 만들어 공개 → 학생 응시 → 서버에서 결정적 채점 후 응시 기록 저장, 서술형은 부모 검수로 분리. 응시 횟수 소진 시 자동 종료, 불합격 시 재시험 전환
- **알림·AI 작업 큐 생산자**: 계획 발행·제출·검수 결정·테스트 공개·서술형 채점 필요 시 알림을 적재하고, 사진 제출은 AI 분석 작업을 큐에 등록
- **자녀별 리포트**: 완료율·정시율·학습시간·평균 점수·검수 대기·취약 과목
- **관리자 운영 화면**: 가족 현황과 작업 큐 상태(수동 확인 대기 AI 작업 포함)
- **서술형 부모 채점**: 자동 채점이 끝난 응시의 서술형 문항에 배점하면 전체 문항 기준으로 최종 점수를 다시 계산하고 합격/재시험을 결정
- **알림 목록과 읽음 처리**: 부모·학생이 각자 받은 알림을 확인
- 가족 정지(`suspended`) 적용: 정지된 가족은 데이터 레이어 진입이 차단됨
- 부모 대시보드: 오늘 과제와 자녀별 진도
- 목차 파싱·일정 배분·결정적 채점 순수 로직과 단위테스트
- PWA manifest/service worker, 360px 모바일·태블릿·데스크톱 레이아웃

### 로드맵 (데모 모드에만 있거나 미구현)

핵심 흐름은 모두 운영 모드에서 동작합니다. 남은 것은 다음과 같습니다.

- 말하기·듣기 문항의 실제 녹음과 음성 인식 *(`transcribeSpeech`는 구현되어 있으나 호출하는 곳이 없음. 현재 말하기 문항은 텍스트 입력으로 응시)*
- 알림톡 발송 *(`sisters_profiles.phone`을 입력하는 화면이 없어 수신자 번호가 비어 있음)*
- 관리자의 가족 정지 토글 *(정지 상태는 적용되지만 전환은 아직 DB에서 직접 해야 함)*
- 이메일 매직링크 *(제거됨. 비밀번호 로그인으로 대체)*

## 주요 화면

| 역할 | 경로 | 용도 | 상태 |
| --- | --- | --- | --- |
| 공통 | `/`, `/login` | 소개와 부모/학생/관리자 로그인 | 동작 |
| 부모 | `/planning` | 강좌·문제집 등록과 학습계획 발행 | 동작 (등록·저장 가능) |
| 부모 | `/reviews` | 제출물 검수와 승인·반려 | 동작 (승인·반려 저장) |
| 부모 | `/tests` | 테스트 작성·공개와 응시 현황 | 동작 (작성·공개 저장) |
| 부모 | `/dashboard`, `/reports` | 오늘 현황과 자녀별 지표 | 동작 |
| 학생 | `/student` | 오늘 학습, 타이머·메모·사진 제출 | 동작 (제출 저장) |
| 학생 | `/student/tests` | 테스트 응시 | 동작 (응시 기록 저장) |
| 학생 | `/student/progress` | 학습 기록 | 운영은 읽기 전용 |
| 공통 | `/notifications` | 알림 목록과 읽음 처리 | 동작 |
| 관리자 | `/admin/ai` | AI 공급자·모델 설정 | 동작 |
| 관리자 | `/admin/families`, `/admin/notifications` | 가족 현황과 작업 큐 상태 | 동작 (읽기 전용) |
| 개인정보 | `/onboarding`, `/settings/privacy`, `/settings/admin-pin` | 보호자 동의와 데이터 권리 요청 | 동작 |

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
2. `supabase/migrations/`의 마이그레이션을 파일명 순서대로 적용합니다(`202608060001_initial_schema.sql` → `202608070001_tighten_rls.sql` → `202608070002_create_plan_with_tasks.sql` → `202608070003_finalize_attempt.sql`). 브라우저에 service role key를 노출하지 마세요.
3. Supabase Auth에서 이메일 공급자를 활성화하고 운영 주소를 Site URL로, `https://운영주소/api/auth/callback`을 Redirect URL로 설정합니다. 현재 Vercel 운영 주소는 `https://sonsisters.vercel.app`입니다. Google과 Kakao는 각 공급자 키를 등록한 뒤 사용합니다.
4. 최소 32자의 `STUDENT_SESSION_SECRET`과 base64 32바이트 `CREDENTIAL_ENCRYPTION_KEY`를 생성합니다.
5. `NEXT_PUBLIC_DEMO_MODE=false`로 바꾼 뒤 최초 운영자 profile의 `role`을 `admin`으로 지정합니다.
6. 운영자로 `/admin/ai`에 로그인해 OpenAI·Google 키와 기능별 모델을 저장합니다. 키는 AES-256-GCM으로 암호화되며 브라우저로 다시 반환되지 않습니다.
7. PortOne store/channel/API secret, Resend, VAPID, SOLAPI 값과 승인된 알림톡 템플릿을 필요에 따라 설정합니다.
8. `vercel.json`은 함수 리전을 `icn1`(서울)로 고정합니다. Supabase 프로젝트를 다른 리전에 만들었다면 이 값을 DB와 같은 리전으로 바꾸세요 — 리전이 어긋나면 페이지마다 왕복 지연이 크게 늘어납니다.
9. Vercel에 `CRON_SECRET`을 설정합니다. Hobby 플랜 제한에 맞춰 `vercel.json`이 작업 큐를 매일 00:00 UTC(한국시간 09:00), 보존 삭제를 매일 03:15 UTC(한국시간 12:15)에 호출합니다.

환경변수의 OpenAI/Google 키는 초기 부트스트랩용 fallback입니다. 운영 중에는 관리자가 화면에서 공급자와 모델을 바꿀 수 있습니다. 기본 모델 목록에 없는 모델 ID도 직접 입력할 수 있습니다.

## AI 라우팅

`src/lib/ai/service.ts`가 다음 기능을 공통 인터페이스로 제공합니다.

- `parseCourseOutline`
- `generateStudyPlan`
- `analyzeSubmission`
- `generateTest`
- `gradeFreeResponse`
- `transcribeSpeech`

구조화 출력은 Zod로 검증합니다. 주 공급자를 최대 2회(지터 백오프) 시도한 뒤 대체 공급자로 전환하며, 모두 실패하면 작업 상태를 `manual_review`로 보내 자동 승인하지 않습니다. API 키 미등록처럼 재시도해도 결과가 같은 오류는 즉시 대체 공급자로 넘어갑니다. 모든 실패는 구조화 로그로 남습니다.

기본 모델은 OpenAI GPT-5.6 3티어(`gpt-5.6-sol` 최상위 / `gpt-5.6-terra` 균형 / `gpt-5.6-luna` 저비용·고속)와 Gemini 2.5 폴백입니다. 모델을 바꿀 때는 공급자의 현행 모델 목록에 실재하는 ID인지 확인하세요 — 없는 ID면 매 호출이 주 공급자 시도를 낭비하고 항상 폴백으로만 동작합니다.

## 보안 설계

- 모든 가족 데이터에 `family_id` 적용 및 RLS 격리
- PIN hash·학생 세션·암호화 AI 키 테이블은 service role 전용
- 감사로그·AI 작업·알림 작업·계획 스냅샷은 가족에게 읽기만 허용(쓰기는 service role 전용)
- **가족 식별자는 항상 세션에서 유도**합니다. 요청 본문의 `familyId`는 받지 않습니다 — service role 조회는 RLS를 우회하므로 클라이언트가 준 값을 신뢰하면 타 가족의 AI 키가 노출됩니다 (`src/lib/auth/family.ts`)
- 상태 변경 요청에 동일 출처 증명 필수(`Origin` 없으면 `Sec-Fetch-Site` 폴백, 둘 다 없으면 거부)
- `/api/ai/*`는 가족당 분당 20회로 제한
- 업로드 형식/10MB 제한, 비공개 버킷
- Storage 경로 첫 세그먼트가 가족 UUID(스토리지 정책이 이 값으로 인가), 조회는 단기 서명 URL
- 테스트 정답·대체정답·해설은 학생 응답에 절대 포함하지 않으며 채점은 서버에서만 수행
- 보호 라우트는 `src/proxy.ts`의 세션 쿠키 게이트 + 페이지 로더의 실제 세션 검증 이중 방어
- 관리자 화면과 API 이중 권한 검사
- 알림 `(notification_id, channel)` 유일키와 작업 점유로 재시도 중복 방지
- AI가 제출물이나 성취를 최종 승인하지 않는 부모 검수 경계
- 오류 응답은 일반화된 메시지만 반환하고 상세는 서버 로그로만 남깁니다

공개 베타 전에는 개인정보 처리방침·이용약관·AI 국외 처리/위탁 고지·만 14세 미만 동의 절차를 국내 법률 전문가와 최종 검토해야 합니다.

## 검증 명령

```bash
npm run typecheck
npm run test
npm run lint
npm run build
```

단위테스트는 목차 파싱, 휴일/요일/마감 충돌을 반영한 일정 배분, 결정적 채점(부분 응답·순서 문항·대체 정답 포함), 계획 과제 생성, 제출 첨부 경로 규칙, API 키 암복호화, 동일 출처 검사, 레이트 리밋을 검증합니다.

GitHub Actions(`.github/workflows/ci.yml`)가 push와 PR마다 위 명령을 모두 실행합니다.

## 배포

Vercel 프로젝트를 이 GitHub 저장소에 연결하고 위 환경변수를 등록한 뒤 배포합니다. 현재 로컬 저장소의 `origin`은 `https://github.com/themonsteredu/sisters.git`입니다.
