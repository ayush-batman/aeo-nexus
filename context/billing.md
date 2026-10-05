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

**Consequence:** organizations that paid through the old one-time flow keep their plan with no end date until someone decides what to do with them (see the October 5 section of `docs/product-rescue/DEPLOYMENT_AND_ROLLBACK.md`).
