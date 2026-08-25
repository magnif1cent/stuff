export const MEMBER_LIST_NAME_MAX_LENGTH = 60;
export const MAX_MEMBER_LISTS = 25;
// Same 280-character convention as User.bio.
export const MEMBER_LIST_DESCRIPTION_MAX_LENGTH = 280;
export const MEMBER_LIST_ENTRY_NOTE_MAX_LENGTH = 240;
// Movies and fight scenes combined — unbounded lists mean an unpaginated
// fetch on every /lists/[listId] load (worse the larger a list gets) and,
// for a ranked list, single-step up/down reordering with no jump-to-position.
export const MAX_ITEMS_PER_LIST = 200;
// How many movies/fight scenes each list shows inline on the profile Lists
// tab before linking out to the list's own page instead of rendering the
// rest — that page fetches every list a member owns in one request, so
// without a per-list cap here a member with many large lists loads all of
// them, fully, on every profile visit.
export const MEMBER_LIST_PROFILE_PREVIEW_LIMIT = 6;
