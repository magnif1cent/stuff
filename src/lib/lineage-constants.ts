// Split out from lib/lineage.ts because that module imports the Prisma
// client (server-only -- it wires up a Postgres adapter at import time) and
// these limits also need to be readable from client components (form
// maxLength, textarea guard) without dragging that into the browser bundle.
export const MAX_LINEAGE_NOTE_LENGTH = 80;
export const MAX_CHAIN_TEXT_LENGTH = 20000;
export const MAX_FIGURE_NAME_LENGTH = 80;
