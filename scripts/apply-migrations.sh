#!/bin/bash

echo "🚀 Applying Supabase Migrations..."
npx supabase migration up

if [ $? -eq 0 ]; then
  echo "✅ Migrations applied successfully!"
else
  echo "❌ Migration failed. Please check if Supabase CLI is installed or if the local database is running."
fi
