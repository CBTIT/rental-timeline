/**
 * Calculate which bucket a lease date falls into
 * @param leaseDate - The lease date to categorize
 * @param firstLeaseDate - The earliest lease date (bucket 0 boundary)
 * @param totalDays - Total days between first and last lease
 * @param bucketCount - Number of buckets (default: 5)
 * @returns Bucket index (0 to bucketCount-1), or -1 if invalid
 */
export function getBucketIndex(
  leaseDate: Date,
  firstLeaseDate: Date,
  totalDays: number,
  bucketCount: number = 5,
): number {
  if (totalDays <= 0) return 0; // No time range, put in bucket 0
  if (!firstLeaseDate || !leaseDate) return -1;

  const dayOverall = Math.floor(
    (leaseDate.getTime() - firstLeaseDate.getTime()) / (24 * 60 * 60 * 1000),
  );

  const bucketSize = totalDays / bucketCount;
  let bucket = Math.floor(dayOverall / bucketSize);

  // Clamp to valid range [0, bucketCount-1]
  bucket = Math.max(0, Math.min(bucketCount - 1, bucket));

  return bucket;
}

/**
 * Calculate bucket boundaries (date ranges)
 * @param firstDate - The earliest date
 * @param totalDays - Total number of days
 * @param bucketCount - Number of buckets (default: 5)
 * @returns Array of Date objects marking bucket boundaries
 */
export function calculateBucketBoundaries(
  firstDate: Date,
  totalDays: number,
  bucketCount: number = 5,
): Date[] {
  const boundaries: Date[] = [];
  const bucketSize = totalDays / bucketCount;

  for (let i = 0; i <= bucketCount; i++) {
    const d = new Date(firstDate);
    d.setDate(d.getDate() + i * bucketSize);
    boundaries.push(d);
  }

  return boundaries;
}
