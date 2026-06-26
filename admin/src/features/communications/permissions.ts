/**
 * Permission keys for Official Communications. The backend seeds `communications.*` keys
 * and grants them to Content Editor (view/create/update) and Publisher (view/update + lifecycle).
 * These only mirror the backend seed; the backend remains the security boundary.
 */

import { modulePermissions } from '@/constants/permissions';

export const COMMUNICATION_PERMS = modulePermissions('official-communications');
