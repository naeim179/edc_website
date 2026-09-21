export type SubscriptionAccessInfo = {
  status: string;
  expires_at: string | null;
};

export function isSubscriptionActive(
  subscription: SubscriptionAccessInfo | null | undefined
) {
  if (!subscription) {
    return false;
  }

  if (subscription.status !== "active") {
    return false;
  }

  if (!subscription.expires_at) {
    // Legacy subscription = unlimited access.
    return true;
  }

  return (
    new Date(subscription.expires_at).getTime() >
    Date.now()
  );
}

export function getDaysRemaining(
  expiresAt: string | null | undefined
) {
  if (!expiresAt) {
    return null;
  }

  const difference =
    new Date(expiresAt).getTime() -
    Date.now();

  return Math.max(
    0,
    Math.ceil(
      difference /
        (1000 * 60 * 60 * 24)
    )
  );
}
