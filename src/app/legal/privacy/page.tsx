import Link from "next/link";

export default function PrivacyPolicyPage() {
  return <LegalPage title="개인정보 처리방침"><p>Sisters는 가족 학습계획, 학생 수행 증빙과 평가 기록을 제공하기 위해 필요한 최소한의 정보를 처리합니다. 공개 베타 출시 전 법률 검토와 사업자 정보 확정이 필요한 초안입니다.</p><h2>처리하는 정보</h2><p>부모 계정 정보, 가족·학생 프로필, 생년월일, 보호자 동의 기록, 계획·제출물·시험 답변, 알림 설정과 보안 감사기록을 처리합니다. 학생 PIN은 복원할 수 없는 해시로 저장합니다.</p><h2>AI 처리와 국외 이전</h2><p>부모가 활성화한 공급자에게 필요한 학습 내용만 전송합니다. AI는 1차 분석과 초안만 제공하며 승인과 성취 판단은 부모가 최종 결정합니다. 공급자, 이전 국가, 보유기간은 출시 전에 별도 고지합니다.</p><h2>보유와 삭제</h2><p>승인된 제출물의 원본 사진·음성은 90일 뒤 자동 삭제하고 분석 결과, 점수, 승인 기록은 서비스 제공에 필요한 기간 동안 유지합니다. 부모는 설정에서 즉시 삭제 또는 전체 내보내기를 요청할 수 있습니다.</p><h2>아동의 개인정보</h2><p>만 14세 미만 학생은 법정대리인 동의와 본인확인 완료 후 계정을 사용합니다. 인증 참조값과 동의 시각을 감사 가능한 형태로 보관합니다.</p><h2>문의</h2><p>개인정보 문의: privacy@sisters.family (베타 운영 주소, 출시 전 확정)</p></LegalPage>;
}

function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return <main className="min-h-screen bg-slate-50 px-5 py-12"><article className="prose mx-auto max-w-3xl rounded-3xl bg-white p-7 shadow-sm md:p-12"><Link href="/" className="text-sm font-bold text-violet-700">← Sisters</Link><h1 className="mt-6 text-3xl font-black">{title}</h1><p className="mt-2 text-xs text-slate-400">초안 · 2026년 8월 6일</p><div className="mt-8 space-y-5 text-sm leading-7 text-slate-600">{children}</div></article></main>;
}
