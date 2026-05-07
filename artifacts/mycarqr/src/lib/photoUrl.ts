/**
 * Photos are stored in the database as one of two shapes:
 *   - "/objects/uploads/<uuid>" — the canonical object-storage path (new uploads).
 *   - "data:image/...;base64,..." — legacy base64 data URLs that pre-date the
 *     object-storage migration and may still be present in old reports.
 *
 * `resolvePhotoSrc` turns either shape into a value usable as an `<img src>`.
 * Object-storage paths are routed through the API gateway at
 * `/api/storage/objects/<id>` (relative URL, served via the dev/prod proxy).
 */
export function resolvePhotoSrc(photo: string): string {
  if (!photo) return photo;
  if (photo.startsWith("/objects/")) {
    return `/api/storage${photo}`;
  }
  return photo;
}
