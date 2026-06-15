/**
 * External Muslim business directory (Farmish / admin portal listing).
 * Override with NEXT_PUBLIC_BUSINESS_DIRECTORY_URL in production if the link changes.
 */
export const BUSINESS_DIRECTORY_URL =
  process.env.NEXT_PUBLIC_BUSINESS_DIRECTORY_URL ??
  "https://youradminportal.com/farmish-app/listing.php?controller=pjListings&action=pjActionLists&ol=16531&category_id=364"
