import "server-only";
import webPush from "web-push";
import { SolapiMessageService } from "solapi";

export interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
  eventType: "plan" | "due" | "submission" | "review" | "test" | "weekly";
}

export interface NotificationRecipient {
  email?: string;
  phone?: string;
  pushSubscriptions?: Array<{ endpoint: string; keys: { p256dh: string; auth: string } }>;
}

export interface DeliveryResult {
  channel: "email" | "web_push" | "kakao";
  delivered: boolean;
  providerId?: string;
  error?: string;
}

export async function sendEmail(recipient: string, payload: NotificationPayload): Promise<DeliveryResult> {
  if (!process.env.RESEND_API_KEY) return { channel: "email", delivered: false, error: "RESEND_API_KEY 미설정" };
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Sisters <study@sisters.family>",
      to: [recipient],
      subject: payload.title,
      html: `<div style="font-family:sans-serif;max-width:560px;margin:auto;padding:32px"><h1 style="font-size:22px">${escapeHtml(payload.title)}</h1><p style="line-height:1.7;color:#475569">${escapeHtml(payload.body)}</p><a href="${escapeHtml(payload.url ?? process.env.NEXT_PUBLIC_APP_URL ?? "")}" style="display:inline-block;margin-top:16px;background:#6d5ce8;color:white;padding:12px 18px;border-radius:12px;text-decoration:none">Sisters에서 확인</a></div>`,
    }),
  });
  if (!response.ok) return { channel: "email", delivered: false, error: `Resend ${response.status}` };
  const data = (await response.json()) as { id?: string };
  return { channel: "email", delivered: true, providerId: data.id };
}

export async function sendWebPush(
  subscriptions: NonNullable<NotificationRecipient["pushSubscriptions"]>,
  payload: NotificationPayload,
): Promise<DeliveryResult> {
  const publicKey = process.env.WEB_PUSH_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_PRIVATE_KEY;
  if (!publicKey || !privateKey || subscriptions.length === 0) {
    return { channel: "web_push", delivered: false, error: "웹푸시 키 또는 구독 없음" };
  }
  webPush.setVapidDetails("mailto:privacy@sisters.family", publicKey, privateKey);
  const results = await Promise.allSettled(
    subscriptions.map((subscription) => webPush.sendNotification(subscription, JSON.stringify(payload))),
  );
  const delivered = results.some((result) => result.status === "fulfilled");
  return { channel: "web_push", delivered, error: delivered ? undefined : "모든 웹푸시 전송 실패" };
}

export async function sendKakaoAlimtalk(phone: string, payload: NotificationPayload): Promise<DeliveryResult> {
  const apiKey = process.env.SOLAPI_API_KEY;
  const apiSecret = process.env.SOLAPI_API_SECRET;
  const from = process.env.SOLAPI_SENDER_NUMBER;
  const pfId = process.env.SOLAPI_KAKAO_PF_ID;
  const templateId = templateFor(payload.eventType);
  if (!apiKey || !apiSecret || !from || !pfId || !templateId) {
    return { channel: "kakao", delivered: false, error: "SOLAPI 또는 승인 템플릿 미설정" };
  }
  try {
    const service = new SolapiMessageService(apiKey, apiSecret);
    const response = await service.send({
      to: phone.replace(/\D/g, ""),
      from: from.replace(/\D/g, ""),
      type: "ATA",
      text: payload.body,
      kakaoOptions: {
        pfId,
        templateId,
        disableSms: false,
        variables: { "#{제목}": payload.title, "#{내용}": payload.body },
      },
    });
    const providerId = "groupId" in response ? String(response.groupId) : undefined;
    return { channel: "kakao", delivered: true, providerId };
  } catch (error) {
    return { channel: "kakao", delivered: false, error: error instanceof Error ? error.message : "SOLAPI 전송 실패" };
  }
}

export async function dispatchExternalNotifications(
  recipient: NotificationRecipient,
  payload: NotificationPayload,
  channels: Array<"web_push" | "email" | "kakao">,
) {
  const results: DeliveryResult[] = [];
  for (const channel of channels) {
    if (channel === "web_push") results.push(await sendWebPush(recipient.pushSubscriptions ?? [], payload));
    if (channel === "email" && recipient.email) results.push(await sendEmail(recipient.email, payload));
    if (channel === "kakao" && recipient.phone) results.push(await sendKakaoAlimtalk(recipient.phone, payload));
  }
  return results;
}

function templateFor(eventType: NotificationPayload["eventType"]) {
  if (["due", "plan", "submission"].includes(eventType)) return process.env.SOLAPI_TEMPLATE_DUE;
  if (eventType === "review") return process.env.SOLAPI_TEMPLATE_REVIEW;
  return process.env.SOLAPI_TEMPLATE_TEST;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]!);
}
