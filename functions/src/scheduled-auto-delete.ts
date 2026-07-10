import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import { defineBoolean } from "firebase-functions/params";

/**
 * Safety flag: set to true in Firebase runtime config to only log
 * what would be deleted without actually deleting.
 */
const DRY_RUN = defineBoolean("AUTO_DELETE_DRY_RUN", { default: false });

/** Max jobs to process per run (safety cap) */
const BATCH_LIMIT = 100;

/**
 * Cron: Daglig kl 03:00 UTC (europe-west1)
 * - Finn jobber med expiresAt < nå
 * - Slett: job doc, offers subcollection, events, ratings, Storage-filer (bilder + PDF)
 *
 * Safety:
 * - DRY_RUN flag logs what would be deleted
 * - Batch deletes (max 500 ops per Firestore batch)
 * - BATCH_LIMIT caps how many jobs per run
 * - Idempotent: already-deleted docs simply don't exist in queries
 */
export const scheduledAutoDelete = onSchedule(
  {
    schedule: "every day 03:00",
    region: "europe-west1",
    timeZone: "Europe/Oslo",
    timeoutSeconds: 540, // 9 min — deletion can be slow
    memory: "512MiB",
  },
  async (_event) => {
    const dryRun = DRY_RUN.value();
    const db = admin.firestore();
    const bucket = admin.storage().bucket();
    const now = admin.firestore.Timestamp.now();

    console.log(
      `[autoDelete] Running${dryRun ? " (DRY RUN)" : ""}. Now: ${now.toDate().toISOString()}`,
    );

    // Query: jobs where expiresAt < now
    const snapshot = await db
      .collection("jobs")
      .where("expiresAt", "<", now)
      .limit(BATCH_LIMIT)
      .get();

    if (snapshot.empty) {
      console.log("[autoDelete] No expired jobs to delete.");
      return;
    }

    console.log(`[autoDelete] Found ${snapshot.size} expired job(s).`);

    let totalDeleted = 0;

    for (const jobDoc of snapshot.docs) {
      const jobId = jobDoc.id;
      const jobData = jobDoc.data();

      console.log(
        `[autoDelete] Processing job ${jobId}, expiresAt: ${jobData.expiresAt?.toDate?.()?.toISOString() ?? "?"}`,
      );

      if (dryRun) {
        await logDryRun(db, bucket, jobId, jobData);
        totalDeleted++;
        continue;
      }

      try {
        await deleteJobCompletely(db, bucket, jobId, jobData);
        totalDeleted++;
        console.log(`[autoDelete] Deleted job ${jobId} completely.`);
      } catch (err) {
        console.error(
          `[autoDelete] Error deleting job ${jobId}:`,
          err instanceof Error ? err.message : err,
        );
        // Continue with next job — don't fail the whole run
      }
    }

    console.log(
      `[autoDelete] Done. Processed ${totalDeleted}/${snapshot.size} job(s).${dryRun ? " (DRY RUN — no deletes)" : ""}`,
    );
  },
);


// ── Helper: delete a job and all related data ────────────────

async function deleteJobCompletely(
  db: admin.firestore.Firestore,
  bucket: ReturnType<typeof admin.storage.prototype.bucket>,
  jobId: string,
  jobData: admin.firestore.DocumentData,
): Promise<void> {
  // 1. Gather all Storage paths FIRST
  const filesToDelete: string[] = [];

  if (Array.isArray(jobData.imageRefs)) {
    filesToDelete.push(...(jobData.imageRefs as string[]));
  }
  if (jobData.pdfRef) {
    filesToDelete.push(jobData.pdfRef as string);
  }

  // Fetch offer attachments before deleting
  const offersSnap = await db.collection(`jobs/${jobId}/offers`).get();
  for (const offerDoc of offersSnap.docs) {
    const attachmentRef = offerDoc.data().attachmentRef;
    if (attachmentRef) {
      filesToDelete.push(attachmentRef as string);
    }
  }

  // 2. Delete offers subcollection
  if (!offersSnap.empty) {
    await batchDelete(db, offersSnap.docs.map((d) => d.ref));
    console.log(`[autoDelete]   Deleted ${offersSnap.size} offer(s) for ${jobId}`);
  }

  // 3. Delete related events
  const eventsSnap = await db
    .collection("events")
    .where("jobId", "==", jobId)
    .get();
  if (!eventsSnap.empty) {
    await batchDelete(db, eventsSnap.docs.map((d) => d.ref));
    console.log(`[autoDelete]   Deleted ${eventsSnap.size} event(s) for ${jobId}`);
  }

  // 4. Delete related ratings
  const ratingsSnap = await db
    .collection("ratings")
    .where("jobId", "==", jobId)
    .get();
  if (!ratingsSnap.empty) {
    await batchDelete(db, ratingsSnap.docs.map((d) => d.ref));
    console.log(`[autoDelete]   Deleted ${ratingsSnap.size} rating(s) for ${jobId}`);
  }

  // 5. Delete Storage files
  for (const filePath of filesToDelete) {
    try {
      await bucket.file(filePath).delete();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("No such object")) {
        console.warn(`[autoDelete]   Failed to delete file ${filePath}: ${msg}`);
      }
    }
  }
  if (filesToDelete.length > 0) {
    console.log(`[autoDelete]   Deleted ${filesToDelete.length} Storage file(s) for ${jobId}`);
  }

  // 6. Delete the job document itself
  await db.doc(`jobs/${jobId}`).delete();
}

// ── Helper: batch delete Firestore docs ──────────────────────

async function batchDelete(
  db: admin.firestore.Firestore,
  refs: admin.firestore.DocumentReference[],
): Promise<void> {
  const BATCH_SIZE = 500;
  for (let i = 0; i < refs.length; i += BATCH_SIZE) {
    const chunk = refs.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    for (const ref of chunk) {
      batch.delete(ref);
    }
    await batch.commit();
  }
}

// ── Helper: dry-run logging ──────────────────────────────────

async function logDryRun(
  db: admin.firestore.Firestore,
  _bucket: ReturnType<typeof admin.storage.prototype.bucket>,
  jobId: string,
  jobData: admin.firestore.DocumentData,
): Promise<void> {
  const offersSnap = await db.collection(`jobs/${jobId}/offers`).get();
  const eventsSnap = await db
    .collection("events")
    .where("jobId", "==", jobId)
    .get();
  const ratingsSnap = await db
    .collection("ratings")
    .where("jobId", "==", jobId)
    .get();

  const storageFiles: string[] = [];
  if (Array.isArray(jobData.imageRefs)) storageFiles.push(...jobData.imageRefs);
  if (jobData.pdfRef) storageFiles.push(jobData.pdfRef);
  for (const offerDoc of offersSnap.docs) {
    if (offerDoc.data().attachmentRef) {
      storageFiles.push(offerDoc.data().attachmentRef);
    }
  }

  console.log(
    `[autoDelete][DRY RUN] Would delete job ${jobId}: ` +
      `${offersSnap.size} offers, ${eventsSnap.size} events, ` +
      `${ratingsSnap.size} ratings, ${storageFiles.length} Storage files`,
  );
}

