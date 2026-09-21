interface Env {
  APP_URL: string;
  CRON_SECRET: string;
}

interface WorkerExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

async function runRenewals(
  env: Env
) {
  const appUrl =
    env.APP_URL.replace(
      /\/+$/,
      ""
    );

  const response =
    await fetch(
      `${appUrl}/api/subscriptions/renew`,
      {
        method: "GET",

        headers: {
          Authorization:
            `Bearer ${env.CRON_SECRET}`,
        },
      }
    );

  const body =
    await response.text();

  if (!response.ok) {
    throw new Error(
      `Renewal endpoint failed (${response.status}): ${body}`
    );
  }

  console.log(
    "Subscription renewal result:",
    body
  );
}

export default {
  async scheduled(
    _controller: unknown,
    env: Env,
    ctx: WorkerExecutionContext
  ) {
    ctx.waitUntil(
      runRenewals(env)
    );
  },

  async fetch(
    _request: Request,
    env: Env
  ) {
    return new Response(
      JSON.stringify({
        ok: true,
        worker:
          "subscription-renewal",
        appConfigured:
          Boolean(env.APP_URL),
      }),
      {
        headers: {
          "content-type":
            "application/json",
        },
      }
    );
  },
};
