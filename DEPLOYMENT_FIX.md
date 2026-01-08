# Fix Production Database Migration

## Issue
The `defaultOffDay` field was added to the schema but not migrated to production database.
Migration failed due to shadow database permission issues.

## Solution
Use `prisma db push` instead of `prisma migrate dev` to apply schema changes directly without shadow database.

## Commands to Run on Server

```bash
# Navigate to backend directory
cd ~/Work/barber-pos/backend

# Apply schema changes directly to database (bypasses shadow database)
npx prisma db push

# Regenerate Prisma Client to match the new schema
npx prisma generate

# Restart the PM2 process
pm2 restart staycool-backend

# Verify the application is running without errors
pm2 logs staycool-backend --lines 50
```

## What This Does

1. **`npx prisma db push`**: Applies schema changes directly to your production database without creating migration files or using a shadow database
2. **`npx prisma generate`**: Regenerates the Prisma Client with the updated schema
3. **`pm2 restart`**: Restarts your application to use the new client
4. **`pm2 logs`**: Checks that everything is working correctly

## Expected Result

After running these commands, the error should be resolved:
- The `defaultOffDay` column will exist in the `User` table
- The API endpoints will work correctly
- No more "Unknown field `defaultOffDay`" errors

## Alternative: If You Want Proper Migrations

If you need to maintain migration history, you'll need to:
1. Grant your database user permission to create databases (for shadow database)
2. Run `npx prisma migrate deploy` to apply pending migrations

Contact your database administrator to grant permissions:
```sql
GRANT CREATE ON *.* TO 'stay_cool'@'%';
FLUSH PRIVILEGES;
```
