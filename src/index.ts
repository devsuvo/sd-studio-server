import app from "./app";
import { env } from "./config/env";

// On Vercel the app is exported as a serverless handler; locally we listen on a port.
if (!process.env.VERCEL) {
  app.listen(env.port, () => {
    console.log(`SD Studio API running on http://localhost:${env.port}`);
  });
}

export default app;
