/**
 * Build-time view of the optional services (see FEATURES.md).
 * Each one switches on when its variable is set at build time — in .env
 * locally, or as a repository variable for the GitHub Pages workflow.
 * All of them are public values; secrets never go here.
 */
import { SUPABASE, PRO } from '~/site.config';
const env = import.meta.env;

export const BACKEND = {
  /** Supabase: accounts, cloud collections, newsletter list, member counter */
  enabled: !!((env.PUBLIC_SUPABASE_URL || SUPABASE.url) && (env.PUBLIC_SUPABASE_ANON_KEY || SUPABASE.anonKey)),
  /** checkout links for Atlas Pro (Gumroad) */
  checkoutMonthly: (env.PUBLIC_CHECKOUT_MONTHLY as string | undefined) || PRO.checkoutMonthly,
  checkoutYearly: (env.PUBLIC_CHECKOUT_YEARLY as string | undefined) || PRO.checkoutYearly,
  /** where subscribers manage or cancel, e.g. https://<store>.lemonsqueezy.com/billing */
  billingPortal: (env.PUBLIC_BILLING_PORTAL as string | undefined) || PRO.billingPortal,
};
