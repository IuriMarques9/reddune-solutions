const required = (name: string, value: string | undefined): string => {
  if (!value || value.length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

export const serverEnv = {
  get RESEND_API_KEY() {
    return required("RESEND_API_KEY", process.env.RESEND_API_KEY);
  },
};

export const publicEnv = {
  baseUrl:
    process.env.NEXT_PUBLIC_BASE_URL ?? "https://reddune.solutions",
};
