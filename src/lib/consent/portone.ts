import "server-only";

export interface VerifiedGuardian {
  reference: string;
  name: string;
  birthDate?: string;
  phoneNumber?: string;
}

interface PortOneIdentityVerification {
  id: string;
  status: "READY" | "VERIFIED" | "FAILED";
  verifiedCustomer?: {
    name?: string;
    birthDate?: string;
    phoneNumber?: string;
  };
}

export async function verifyGuardianIdentity(identityVerificationId: string): Promise<VerifiedGuardian> {
  const secret = process.env.PORTONE_API_SECRET;
  if (!secret) throw new Error("PortOne API 비밀키가 설정되지 않았습니다.");

  const response = await fetch(
    `https://api.portone.io/identity-verifications/${encodeURIComponent(identityVerificationId)}`,
    { headers: { Authorization: `PortOne ${secret}` }, cache: "no-store" },
  );
  if (!response.ok) throw new Error(`PortOne 인증 조회에 실패했습니다. (${response.status})`);

  const verification = (await response.json()) as PortOneIdentityVerification;
  if (verification.status !== "VERIFIED" || !verification.verifiedCustomer?.name) {
    throw new Error("완료된 보호자 본인인증을 확인할 수 없습니다.");
  }

  return {
    reference: verification.id,
    name: verification.verifiedCustomer.name,
    birthDate: verification.verifiedCustomer.birthDate,
    phoneNumber: verification.verifiedCustomer.phoneNumber,
  };
}
