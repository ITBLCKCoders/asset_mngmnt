import {
  BookOpen,
  FileText,
  ListChecks,
  UserPlus,
  LogIn,
  KeyRound,
  User,
  Pencil,
  PenTool,
  CreditCard,
  Package,
  FileCheck,
  PlusCircle,
  Tag,
  UserCheck,
  ArrowDownToLine,
  ArrowRightLeft,
  RotateCcw,
  Wrench,
  Hammer,
  Trash2,
  Settings,
  Users,
} from 'lucide-react';

/** Cover step is "step 1" — the logo + title slide before the numbered steps. */
export const COVER_STEP = 1;

export const STEP_TITLES = [
  'Introduction',
  'Getting Started',
  'Overview',
  'Registration',
  'Log In',
  'Forgot password',
  'Profile page',
  'Edit Profile',
  'Digital Initials',
  'Account tab',
  'Documents tab',
  'Accountability form',
  'Return form',
  'Transfer form',
  'My assets Page',
  'Asset accountability forms',
  'Adding of assets',
  'Asset tagging',
  'Asset assignment',
  'Asset Return Request',
  'Asset return',
  'return request',
  'Asset transfer request',
  'Asset transfer',
  'transfer request',
  'Asset maintenance',
  'Asset repair',
  'Asset disposal',
  'Settings',
  'User',
];

/**
 * Sub-step flag (0-based, parallel to STEP_TITLES). Sub-steps are indented in
 * the stepper sidebar and roll up under the most recent non-sub-step parent.
 */
export const STEP_IS_SUB = [
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  true, // Edit Profile
  true, // Signing and forms
  true, // Account tab
  true, // Documents tab
  true, // Accountability form (sub of Documents tab)
  true, // Return form (sub of Documents tab)
  true, // Transfer form (sub of Documents tab)
  false,
  true, // Asset accountability forms (sub of My assets Page)
  false, // 16 Adding of assets
  false, // 17 Asset tagging
  false, // 18 Asset assignment
  false, // 19 Asset Return Request (main)
  false, // 20 Asset return (main)
  true, // 21 return request (sub of Asset return)
  false, // 22 Asset transfer request (main)
  false, // 23 Asset transfer (main)
  true, // 24 transfer request (sub of Asset transfer)
  false, // 25 Asset maintenance
  false,
  false,
  false,
  false,
];

/** Sub-sub-step flag — second-level indent (only the Documents-tab forms). */
export const STEP_IS_SUB_SUB = [
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  true, // Accountability form
  true, // Return form
  true, // Transfer form
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
];

export const STEP_ICONS = [
  BookOpen,
  FileText,
  ListChecks,
  UserPlus,
  LogIn,
  KeyRound,
  User,
  Pencil,
  PenTool,
  CreditCard,
  FileText,
  FileCheck,
  ArrowDownToLine,
  ArrowRightLeft,
  Package,
  FileCheck,
  PlusCircle,
  Tag,
  UserCheck,
  ArrowDownToLine,
  RotateCcw,
  ArrowDownToLine,
  ArrowRightLeft,
  ArrowRightLeft,
  ArrowRightLeft,
  Wrench,
  Hammer,
  Trash2,
  Settings,
  Users,
];

export const STEPS = STEP_TITLES.length;
export const MAX_STEP = COVER_STEP + STEPS;

// ---------------------------------------------------------------------------
// Shared content styles (Tailwind class strings)
// ---------------------------------------------------------------------------

export const manualArticle =
  'w-full h-full py-4 pr-4 bg-gradient-to-br from-muted/30 to-transparent dark:from-muted/20 rounded-lg';
export const manualBody = 'text-[1.08rem] leading-[1.8] text-foreground/90';
export const manualPara = `${manualBody} mb-6`;
export const manualParaLast = `${manualBody} mb-0`;
export const manualSectionTitle =
  'text-lg font-semibold text-foreground mt-8 mb-3 flex items-center gap-2';
export const manualSectionAccent = 'flex h-7 w-1 rounded-full bg-red-600 shrink-0';
export const manualListGap = 'list-none space-y-3';
export const manualListItem = `${manualBody} flex gap-3 items-start`;
export const manualListNumber =
  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-600 text-white text-sm font-bold';

// ---------------------------------------------------------------------------
// Stepper hierarchy helpers
// ---------------------------------------------------------------------------

/**
 * Build a parallel array where sub-steps point at their nearest parent step.
 *
 * Rules:
 * - Top-level steps (`!STEP_IS_SUB`) get `-1`.
 * - Sub-sub steps walk backwards to find the nearest sub-step that is *not*
 *   itself a sub-sub-step (their direct parent).
 * - Plain sub-steps walk backwards to find the nearest top-level step.
 */
function buildParentIndices(): number[] {
  const parentIndex: number[] = [];
  for (let j = 0; j < STEPS; j++) {
    if (!STEP_IS_SUB[j]) {
      parentIndex[j] = -1;
    } else if (STEP_IS_SUB_SUB[j]) {
      let p = -1;
      for (let k = j - 1; k >= 0; k--) {
        if (STEP_IS_SUB[k] && !STEP_IS_SUB_SUB[k]) {
          p = k;
          break;
        }
      }
      parentIndex[j] = p;
    } else {
      let p = -1;
      for (let k = j - 1; k >= 0; k--) {
        if (!STEP_IS_SUB[k]) {
          p = k;
          break;
        }
      }
      parentIndex[j] = p;
    }
  }
  return parentIndex;
}

export const STEP_PARENT_INDEX = buildParentIndices();

export function stepHasChildren(stepIndex: number): boolean {
  return STEP_PARENT_INDEX.some(p => p === stepIndex);
}
