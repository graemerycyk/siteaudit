import Stripe from 'stripe';

// Only initialize Stripe on the server and when the API key is available
let stripe: Stripe | null = null;

if (typeof process !== 'undefined' && process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-02-24.acacia',
  });
}

export { stripe }; 