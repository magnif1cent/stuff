// Shared by the movie-level admin-rating route and RatingCard's note field,
// so the client's `maxLength` can't silently drift from what the server
// actually enforces.
export const MAX_ADMIN_NOTE_LENGTH = 2000;
