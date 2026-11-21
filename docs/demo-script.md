# End-to-end demonstration recording

Record a single 2–3 minute screen capture after deploying the same commit to staging and production. Keep the browser URL visible in the recording.

## Walkthrough

1. Open the public production URL and show the application page loading.
2. Add a record with a recognizable title and details. Show it appear in the collection.
3. Refresh the browser and show the record is still present.
4. Delete that record and show it disappear. Refresh once more to show the deletion persisted.
5. In a separate terminal, show `GET /api/health` and `GET /ready` returning HTTP 200.
6. For the availability check, stop or isolate PostgreSQL in a disposable staging environment. Show the frontend remains loaded and displays its API-unavailable message, and show `/ready` returning HTTP 503. Restore PostgreSQL and show the API recovers.
7. Briefly show the workflow run for the deployed commit and the staging-to-production promotion.

Do not expose credentials, secret values, AWS account credentials, or the contents of environment files in the recording. Avoid changing production data during the outage demonstration; use staging or another disposable environment.
