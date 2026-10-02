export const MEMBER_LIST_NAME_MAX_LENGTH = 60;
export const MAX_MEMBER_LISTS = 25;
// Same 280-character convention as User.bio.
export const MEMBER_LIST_DESCRIPTION_MAX_LENGTH = 280;
export const MEMBER_LIST_ENTRY_NOTE_MAX_LENGTH = 240;
// Movies and fight scenes combined — unbounded lists mean an unpaginated
// fetch on every /lists/[listId] load (worse the larger a list gets) and,
// for a ranked list, single-step up/down reordering with no jump-to-position.
export const MAX_ITEMS_PER_LIST = 200;
