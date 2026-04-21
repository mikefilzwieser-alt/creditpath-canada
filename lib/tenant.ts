export type TenantConfig = {
  name: string;
  logoText: string;
  colors: {
    dark: string;
    teal: string;
    gold: string;
    lightBg: string;
    cardBg: string;
    muted: string;
    border: string;
  };
};

export const defaultTenant: TenantConfig = {
  name: "Credit Path Canada",
  logoText: "Credit Path Canada",
  colors: {
    dark: "#0F1923",
    teal: "#00C9A7",
    gold: "#F5C518",
    lightBg: "#F8F9FC",
    cardBg: "#FFFFFF",
    muted: "#6B7280",
    border: "rgba(15,25,35,0.08)",
  },
};
