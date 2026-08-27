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
  Bell,
  CheckCircle2,
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
  'Editing of asset',
  'Editing of asset (Finance)',
  'Asset tagging',
  'Asset assignment',
  'Asset Return Request',
  'Create Asset Builder',
  'Edit Asset Builder',
  'Notification Settings',
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
  'Assign role and custodian access',
  'Assign module permission',
  'Assign approver and sub-approver',
  'Approval Return',
  'HR Accountability Copy',
];

/**
 * Sub-step flag (0-based, parallel to STEP_TITLES). Sub-steps are indented in
 * the stepper sidebar and roll up under the most recent non-sub-step parent.
 */
export const STEP_IS_SUB = [
  false, // 0 Introduction
  false, // 1 Getting Started
  false, // 2 Overview
  false, // 3 Registration
  false, // 4 Log In
  false, // 5 Forgot password
  false, // 6 Profile page
  true, // 7 Edit Profile
  true, // 8 Digital Initials
  true, // 9 Account tab
  true, // 10 Documents tab
  true, // 11 Accountability form (sub of Documents tab)
  true, // 12 Return form (sub of Documents tab)
  true, // 13 Transfer form (sub of Documents tab)
  false, // 14 My assets Page
  true, // 15 Asset accountability forms (sub of My assets Page)
  false, // 16 Adding of assets
  true, // 17 Editing of asset (sub of Adding of assets)
  true, // 18 Editing of asset (Finance) (sub of Adding of assets)
  false, // 19 Asset tagging
  false, // 20 Asset assignment
  false, // 21 Asset Return Request (main)
  false, // 22 Create Asset Builder (main)
  true, // 23 Edit Asset Builder (sub of Create Asset Builder)
  false, // 24 Notification Settings (main)
  false, // 25 Asset return (main)
  true, // 26 return request (sub of Asset return)
  false, // 27 Asset transfer request (main)
  false, // 28 Asset transfer (main)
  true, // 29 transfer request (sub of Asset transfer)
  false, // 30 Asset maintenance
  false, // 31 Asset repair
  false, // 32 Asset disposal
  false, // 33 Settings
  false, // 34 User
  true, // 35 Assign role and custodian access (sub of User)
  true, // 36 Assign module permission (sub of User)
  true, // 37 Assign approver and sub-approver (sub of User)
  false, // 38 Approval Return (main)
  true, // 39 HR Accountability Copy (sub of Documents tab)
];

/** Sub-sub-step flag — second-level indent (only the Documents-tab forms and HR Accountability Copy). */
export const STEP_IS_SUB_SUB = [
  false, // 0
  false, // 1
  false, // 2
  false, // 3
  false, // 4
  false, // 5
  false, // 6
  false, // 7
  false, // 8
  false, // 9
  false, // 10
  true, // 11 Accountability form
  true, // 12 Return form
  true, // 13 Transfer form
  false, // 14
  false, // 15
  false, // 16
  false, // 17
  false, // 18
  false, // 19
  false, // 20
  false, // 21
  false, // 22
  false, // 23
  false, // 24
  false, // 25
  false, // 26
  false, // 27
  false, // 28
  false, // 29
  false, // 30
  false, // 31
  false, // 32
  false, // 33
  false, // 34
  false, // 35
  false, // 36
  false, // 37
  false, // 38
  true, // 39 HR Accountability Copy (sub-sub of Documents tab)
];

export const STEP_ICONS = [
  BookOpen, // 0 Introduction
  FileText, // 1 Getting Started
  ListChecks, // 2 Overview
  UserPlus, // 3 Registration
  LogIn, // 4 Log In
  KeyRound, // 5 Forgot password
  User, // 6 Profile page
  Pencil, // 7 Edit Profile
  PenTool, // 8 Digital Initials
  CreditCard, // 9 Account tab
  FileText, // 10 Documents tab
  FileCheck, // 11 Accountability form
  ArrowDownToLine, // 12 Return form
  ArrowRightLeft, // 13 Transfer form
  Package, // 14 My assets Page
  FileCheck, // 15 Asset accountability forms
  PlusCircle, // 16 Adding of assets
  Pencil, // 17 Editing of asset
  CreditCard, // 18 Editing of asset (Finance)
  Tag, // 19 Asset tagging
  UserCheck, // 20 Asset assignment
  ArrowDownToLine, // 21 Asset Return Request
  Package, // 22 Create Asset Builder
  Pencil, // 23 Edit Asset Builder
  Bell, // 24 Notification Settings
  RotateCcw, // 25 Asset return
  ArrowDownToLine, // 26 return request
  ArrowRightLeft, // 27 Asset transfer request
  ArrowRightLeft, // 28 Asset transfer
  ArrowRightLeft, // 29 transfer request
  Wrench, // 30 Asset maintenance
  Hammer, // 31 Asset repair
  Trash2, // 32 Asset disposal
  Settings, // 33 Settings
  Users, // 34 User
  UserCheck, // 35 Assign role and custodian access
  Settings, // 36 Assign module permission
  Users, // 37 Assign approver and sub-approver
  CheckCircle2, // 38 Approval Return
  FileCheck, // 39 HR Accountability Copy
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
