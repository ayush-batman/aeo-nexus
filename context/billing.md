# Billing

## Razorpay bills through Subscriptions, not one-time orders

**Id:** b70519a2-a2a3-457a-8148-fcc6e11e9304
**Type:** decision
**Status:** active
**Evidence:** confirmed
**Source:** maintainer decision in a working session, 2026-10-05; QA finding B-1 in `docs/product-rescue/QA_2026-10-05.md`
**Revisit when:** Razorpay changes its Subscriptions or UPI Autopay rules, or the plan catalogue stops being monthly

Razorpay checkout creates a monthly Razorpay Subscription, and an organization's plan follows that subscription's status as fetched from Razorpay. Only `active` grants the paid plan, matching how Stripe's non-active statuses are already treated.

**Reason:** the earlier one-time order upgraded the organization with no end date, so a single payment for a plan priced "per month" granted it indefinitely. Subscriptions charge every month and report failed renewals and cancellations, so access ends when payment does, with no renewal step for the customer.

**Rejected alternative:** keep one-time payments, give each one a 30-day end date, and downgrade with a daily job. Quicker to build, but customers would have to pay again by hand every month, which does not match the "per month" pricing.

**Consequence:** organizations that paid through the old one-time flow needed an end date of their own (next entry). Customers cancel renewing subscriptions from Settings → Billing, keeping the plan until the end of the paid period (see the October 5 section of `docs/product-rescue/DEPLOYMENT_AND_ROLLBACK.md`).

## Legacy one-time Razorpay payers get 30 days from deploy day

**Id:** aff1f971-0201-4549-adc2-0dd4a0b28eb7
**Type:** decision
**Status:** active
**Evidence:** inferred
**Source:** maintainer decision in a working session, 2026-10-05
**See:** billing.md#razorpay-bills-through-subscriptions-not-one-time-orders — b70519a2-a2a3-457a-8148-fcc6e11e9304 — as of 2026-10-05

Organizations still holding a `pay_…` reference from the retired one-time flow keep their plan for 30 days from the first run of the daily expiry job after deploy, whatever their payment date, then move to Free.

**Reason:** counting from the payment date would move anyone who paid more than 30 days before deploy to Free on the first run, with no notice. The choice of deploy day was made right after that consequence was pointed out; that it was the deciding reason is inferred, not stated.

**Rejected alternative:** 30 days from each customer's recorded payment date. Closer to what a single month's payment bought, but it downgrades long-standing payers immediately.
