import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import { defineBoolean } from "firebase-functions/params";

/**
 * Safety flag: set to true in Firebase runtime config to only log
 * what would be completed without actually writing.
 */
const DRY_RUN = defineBoolean("AUTO_COMPLETE_DRY_RUN", { default: false });

/** How many days after acceptedAt before auto-completing */
const AUTO_COMPLETE_DAYS = 14;

/** Max jobs to process per run (safety cap) */
const BATCH_LIMIT = 200;

/**
 * Cron: Daglig kl 02:00 UTC (europe-west1)
 * - Finn jobber med status=accepted og acceptedAt + 14d < nå
 * - Sett status = completed, completedAt = now
 * - Logg job_completed event
 *
 * Idempotent: jobs already completed are skipped by the query filter.
 */
export const scheduledAutoComplete = onSchedule(
  {
    schedule: "every day 02:00",
    region: "europe-west1",
    timeZone: "Europe/Oslo",
  },
  async (_event) => {
    const dryRun = DRY_RUN.value();
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();

    // 14 days ago
    const cutoff = admin.firestore.Timestamp.fromMillis(
      now.toMillis() - AUTO_COMPLETE_DAYS * 24 * 60 * 60 * 1000,
    );

    console.log(
      `[autoComplete] Running${dryRun ? " (DRY RUN)" : ""}. Cutoff: ${cutoff.toDate().toISOString()}`,
    );

    // Query: accepted jobs where acceptedAt <= cutoff
    const snapshot = await db
      .collection("jobs")
      .where("status", "==", "accepted")
      .where("acceptedAt", "<=", cutoff)
      .limit(BATCH_LIMIT)
      .get();

    if (snapshot.empty) {
      console.log("[autoComplete] No jobs to auto-complete.");
      return;
    }

    console.log(
      `[autoComplete] Found ${snapshot.size} job(s) to auto-complete.`,
    );

    // Process in batches of 500 (Firestore limit per batch write)
    const FIRESTORE_BATCH_LIMIT = 500;
    let processed = 0;

    for (let i = 0; i < snapshot.docs.length; i += FIRESTORE_BATCH_LIMIT) {
      const chunk = snapshot.docs.slice(i, i + FIRESTORE_BATCH_LIMIT);

      if (dryRun) {
        for (const doc of chunk) {
          const data = doc.data();
          console.log(
            `[autoComplete][DRY RUN] Would complete job ${doc.id}, acceptedAt: ${data.acceptedAt?.toDate?.()?.toISOString() ?? "?"}`,
          );
        }
        processed += chunk.length;
        continue;
      }

      const batch = db.batch();
      const eventDocs: admin.firestore.DocumentReference[] = [];

      for (const doc of chunk) {
        // Update job status
        batch.update(doc.ref, {
          status: "completed",
          completedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Create event doc reference
        const eventRef = db.collection("events").doc();
        eventDocs.push(eventRef);
        batch.set(eventRef, {
          type: "job_completed",
          jobId: doc.id,
          metadata: { reason: "auto_complete_14d" },
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      await batch.commit();
      processed += chunk.length;

      console.log(
        `[autoComplete] Committed batch: ${chunk.length} job(s), total so far: ${processed}`,
      );
    }

    console.log(
      `[autoComplete] Done. Processed ${processed} job(s).${dryRun ? " (DRY RUN — no writes)" : ""}`,
    );
  },
);

