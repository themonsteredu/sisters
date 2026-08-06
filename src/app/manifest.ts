import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sisters 학습 매니저",
    short_name: "Sisters",
    description: "우리 가족을 위한 계획·인증·테스트 학습관리",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f7f7fb",
    theme_color: "#6d5ce8",
    lang: "ko",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
