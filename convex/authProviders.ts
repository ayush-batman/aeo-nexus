import { v } from 'convex/values';

import { query } from './_generated/server';

export const status = query({
  args: {},
  returns: v.object({ google: v.boolean() }),
  handler: async () => ({
    google: Boolean(
      process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
    ),
  }),
});
