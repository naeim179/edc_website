interface Env {
  APP_URL: string;
  CRON_SECRET: string;
  MAIN_APP: { fetch: typeof fetch };
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
    await env.MAIN_APP.fetch(
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

async function runReconciliation(env: Env) {
  const appUrl = env.APP_URL.replace(/\/+$/, "");

  const response = await env.MAIN_APP.fetch(
    appUrl + "/api/payments/reconcile",
    {
      method: "GET",
      headers: {
        Authorization: "Bearer " + env.CRON_SECRET,
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      "PayTabs reconciliation HTTP " + response.status
    );
  }

  console.log(
    "PayTabs reconciliation:",
    await response.text()
  );
}

const renewalWorker = {
  async scheduled(
    controller: { cron: string },
    env: Env,
    ctx: WorkerExecutionContext
  ) {
    if (controller.cron === "0 * * * *") {
      ctx.waitUntil(runRenewals(env));
    }

    if (controller.cron === "*/5 * * * *") {
      ctx.waitUntil(runReconciliation(env));
    }
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

export default renewalWorker;
