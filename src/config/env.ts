import "dotenv/config";

const trim = (url: string) => url.replace(/\/+$/, "");

export const env = {
  port: Number(process.env.PORT ?? 5000),
  mongoUri: process.env.MONGODB_URI ?? "",
  dbName: process.env.DB_NAME ?? "studiospace",
  clientUrl: trim(process.env.CLIENT_URL ?? "http://localhost:3000"),
  imgbbKey: process.env.IMGBB_API_KEY ?? "",
  extraOrigins: (process.env.EXTRA_ORIGINS ?? "")
    .split(",")
    .map((o) => trim(o.trim()))
    .filter(Boolean),
};
