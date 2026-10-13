# Operations Runbook

## 1. Incident Management & Severity Matrix

| Severity | Incident Description | Expected Response Time | Action Procedure |
| :--- | :--- | :--- | :--- |
| **SEV-1** | API down, payment webhooks failing, database inaccessible | < 15 minutes | Check container logs, restart container, verify MongoDB connection string and cluster health. |
| **SEV-2** | AI generation throwing provider errors, Cloudinary upload quotas exhausted | < 1 hour | Verify Gemini API balance/quotas; check Cloudinary storage bandwidth; notify users with UI banner. |
| **SEV-3** | Catalog ingestion job failed or delayed; non-breaking UI glitch | < 4 hours | Inspect ingestion logs in admin console; retry idempotent sync. |

---

## 2. Database Backup & Restore Procedure

### Taking a Snapshot (MongoDB Atlas)
```bash
# Automated via Atlas Cloud Backup or CLI
mongodump --uri="mongodb+srv://<user>:<pass>@cluster0.mongodb.net/elibrary" --archive=backup_$(date +%Y%m%d_%H%M%S).gz --gzip
```

### Restoring from Archive
```bash
mongorestore --uri="mongodb+srv://<user>:<pass>@cluster0.mongodb.net/elibrary" --archive=backup_YYYYMMDD_HHMMSS.gz --gzip --drop
```
> **Warning**: The `--drop` flag will drop collections prior to restoration. Ensure authorization before running in production.

---

## 3. Razorpay Payment Reconciliation Runbook

### If a customer reports money deducted but Pro status not activated:
1. Copy customer email or Razorpay Payment ID (`pay_...`).
2. Search Razorpay Dashboard $\rightarrow$ Payments for the transaction.
3. Check Webhook Logs $\rightarrow$ search event deliveries for `payment.captured`.
4. If webhook failed delivery (e.g., temporary server timeout):
   - Trigger manual webhook retry from Razorpay dashboard, OR
   - Run manual reconciliation script:
     ```bash
     node src/scripts/reconcilePayment.js --paymentId=pay_xxxxxxxxxxxxxx
     ```
5. Confirm user document in MongoDB updates `isPro: true` and active subscription end date.

---

## 4. Content Takedown & Copyright Incident Procedure (India DMCA / Copyright Act)

1. Receive notice via `copyright@yourdomain.com` or admin content reporting tool.
2. Verify complainant identity and specific book identifier (`bookId`).
3. Set `rightsStatus: 'blocked'` in the database immediately:
   ```javascript
   await Book.findByIdAndUpdate(bookId, { rightsStatus: 'blocked' });
   ```
4. Blocked books are immediately omitted from public catalog queries, search results, and digital reader endpoints.
5. Notify the user/uploader and maintain an audit log of all takedown actions.
