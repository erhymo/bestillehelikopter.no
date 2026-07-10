import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

/**
 * Trigger: Firestore onCreate on ratings/{ratingId}
 *
 * 1. Auto-approve if score >= 3, else pendingApproval
 * 2. Recalculate company.avgRating and ratingCount (all ratings, not just approved)
 * 3. For score 1-2: create admin notification doc
 */
export const onRatingCreate = onDocumentCreated(
  { document: "ratings/{ratingId}", region: "europe-west1" },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const ratingId = event.params.ratingId;
    const data = snapshot.data();
    const { score, companyId, jobId, comment } = data;

    const db = admin.firestore();

    // 1. Auto-approve logic: score >= 3 → approved, 1-2 → pending
    //    Comments always start unapproved if score < 3
    const autoApprove = score >= 3;

    await snapshot.ref.update({
      approved: autoApprove,
    });

    console.log(
      `[onRatingCreate] Rating ${ratingId}: score=${score}, approved=${autoApprove}`,
    );

    // 2. Recalculate company stats from ALL ratings for this company
    const ratingsSnap = await db
      .collection("ratings")
      .where("companyId", "==", companyId)
      .get();

    let totalScore = 0;
    let count = 0;
    for (const doc of ratingsSnap.docs) {
      totalScore += doc.data().score as number;
      count++;
    }

    const avgRating = count > 0 ? Math.round((totalScore / count) * 10) / 10 : 0;

    await db.doc(`companies/${companyId}`).update({
      avgRating,
      ratingCount: count,
    });

    console.log(
      `[onRatingCreate] Updated company ${companyId}: avgRating=${avgRating}, ratingCount=${count}`,
    );

    // 3. For low scores (1-2): create admin notification
    if (!autoApprove) {
      await db.collection("admin_notifications").add({
        type: "low_rating",
        ratingId,
        jobId,
        companyId,
        score,
        comment: comment || "",
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(
        `[onRatingCreate] Admin notification created for low rating ${ratingId} (score=${score})`,
      );
    }
  },
);

