import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  COVER_STEP,
  STEP_TITLES,
  STEP_IS_SUB,
  STEP_IS_SUB_SUB,
  STEP_ICONS,
  STEPS,
  MAX_STEP,
  STEP_PARENT_INDEX,
  stepHasChildren,
  manualArticle,
  manualBody,
  manualPara,
  manualParaLast,
  manualSectionTitle,
  manualSectionAccent,
  manualListGap,
  manualListItem,
  manualListNumber,
} from '@/pages/userManual/manualConfig';
import { PageHeader } from '@/components/common/PageHeader';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import reg1Img from '@/assets/manual/reg1.png';
import reg2Img from '@/assets/manual/reg 2.png';
import reg4Img from '@/assets/manual/reg4.png';
import log1Img from '@/assets/manual/log1.png';
import forgot1Img from '@/assets/manual/forgot1.png';
import forgot2Img from '@/assets/manual/forgot2.png';
import forgot3Img from '@/assets/manual/forgot3.png';
import forgot4Img from '@/assets/manual/forgot4.png';
import profile1Img from '@/assets/manual/profile1 .png';
import profile2Img from '@/assets/manual/profile2.png';
import profile3Img from '@/assets/manual/profile3.png';
import profile4Img from '@/assets/manual/profile4.png';
import profile5Img from '@/assets/manual/profile5.png';
import profile6Img from '@/assets/manual/profile6.png';
import profile7Img from '@/assets/manual/profile7.png';
import profile8Img from '@/assets/manual/profile8.png';
import profile11Img from '@/assets/manual/profile11.png';
import profile12Img from '@/assets/manual/profile12.png';
import profile13Img from '@/assets/manual/profile13.png';
import profile14Img from '@/assets/manual/profile14.png';
import profile15Img from '@/assets/manual/profile15.png';
import profile16Img from '@/assets/manual/profile16.png';
import my1Img from '@/assets/manual/my1.png';
import my2Img from '@/assets/manual/my2.png';
import my3Img from '@/assets/manual/my3.png';
import accountability1Img from '@/assets/manual/accountability1.png';
import accountability2Img from '@/assets/manual/accountability2.png';
import accountability3Img from '@/assets/manual/accountability3.png';
import accountability5Img from '@/assets/manual/accountability5.png';
import add1Img from '@/assets/manual/add1.png';
import add2Img from '@/assets/manual/add2.png';
import add3Img from '@/assets/manual/add3.png';
import add4Img from '@/assets/manual/add4.png';
import add6Img from '@/assets/manual/add6.png';
import add7Img from '@/assets/manual/add7.png';
import add8Img from '@/assets/manual/add8.png';
import add9Img from '@/assets/manual/add9.png';
import add10Img from '@/assets/manual/add10.png';
import tag1Img from '@/assets/manual/tag1.png';
import tag2Img from '@/assets/manual/tag2.png';
import tag3Img from '@/assets/manual/tag3.png';
import assign1Img from '@/assets/manual/assign1.png';
import assign2Img from '@/assets/manual/assign2.png';
import assign3Img from '@/assets/manual/assign3.png';
import returnreq1Img from '@/assets/manual/returnreq1.png';
import returnreq2Img from '@/assets/manual/returnreq2.png';
import returnreq3Img from '@/assets/manual/returnreq3.png';
import returnreq4Img from '@/assets/manual/returnreq4.png';
import returnreq5Img from '@/assets/manual/returnreq5.png';
import return1Img from '@/assets/manual/return1.png';
import return2Img from '@/assets/manual/return2.png';
import return3Img from '@/assets/manual/return3.png';
import return4Img from '@/assets/manual/return4.png';
import return5Img from '@/assets/manual/return5.png';
import transferreq1Img from '@/assets/manual/transferreq1.png';
import transferreq2Img from '@/assets/manual/transferreq2.png';
import transferreq3Img from '@/assets/manual/transferreq3.png';
import transferreq4Img from '@/assets/manual/transferreq4.png';
import transferreq5Img from '@/assets/manual/transferreq5.png';
import transfer1Img from '@/assets/manual/transfer1.png';
import transfer2Img from '@/assets/manual/transfer2.png';
import transfer3Img from '@/assets/manual/transfer3.png';
import transfer4Img from '@/assets/manual/transfer4.png';

// Stepper navigation data, sub-step flags, icons, and shared style class
// strings now live in `./userManual/manualConfig` and are imported above.
// The big *_CONTENT constants below remain inline here because each one
// references a distinct set of imported PNG assets at the top of this file.


const INTRODUCTION_CONTENT = (
  <article className={manualArticle}>
    <p
      className={`${manualPara} first-letter:text-5xl first-letter:font-bold first-letter:text-red-600 first-letter:mr-1 first-letter:float-left first-letter:leading-none first-letter:mt-0.5`}
    >
      Welcome to the Asset Management System – Complete User Manual. This manual
      is designed to help users understand, operate, and maximize the
      capabilities of the Asset Management System. The system is built to
      efficiently track, manage, and monitor organizational assets throughout
      their entire lifecycle—from acquisition and allocation to maintenance and
      disposal.
    </p>
    <p className={manualPara}>
      Managing assets effectively is essential for improving operational
      efficiency, reducing losses, and ensuring accurate record-keeping. The
      Asset Management System provides a centralized platform where
      organizations can maintain a detailed inventory of assets, monitor their
      status and location, assign them to departments or employees, and generate
      reports for better decision-making.
    </p>
    <p className={manualParaLast}>
      This user manual serves as a comprehensive guide for system users,
      administrators, and managers. It explains the system features, navigation,
      and processes required to manage assets efficiently. By following the
      instructions provided in this manual, users will be able to perform
      asset-related tasks accurately and maintain up-to-date asset records
      within the system.
    </p>
  </article>
);

const GETTING_STARTED_CONTENT = (
  <article className={manualArticle}>
    <p className={manualPara}>
      Before using the Asset Management System, users should ensure that they
      have the necessary access credentials and permissions provided by the
      system administrator.
    </p>

    <h3 className={manualSectionTitle}>
      <span className={manualSectionAccent} />
      System Requirements
    </h3>
    <p className={`${manualBody} mb-4`}>
      To access the system effectively, ensure the following requirements are
      met:
    </p>
    <ul className={`${manualListGap} mb-6`}>
      {[
        'A computer, laptop, or mobile device with internet access',
        'A modern web browser (such as Chrome, Edge, or Firefox)',
        'Valid user credentials (username and password)',
        'Access permissions based on assigned user roles',
      ].map((item, i) => (
        <li key={i} className={manualListItem}>
          <span className={manualListNumber}>{i + 1}</span>
          {item}
        </li>
      ))}
    </ul>

    <h3 className={manualSectionTitle}>
      <span className={manualSectionAccent} />
      Logging into the System
    </h3>
    <ol className={`${manualListGap} mb-6`}>
      {[
        'Open your web browser.',
        'Enter the system URL provided by your administrator.',
        'On the login page, enter your username and password.',
        'Click the Login button to access the system dashboard.',
      ].map((item, i) => (
        <li key={i} className={manualListItem}>
          <span className={manualListNumber}>{i + 1}</span>
          {item}
        </li>
      ))}
    </ol>
    <p className={manualParaLast}>
      If login credentials are incorrect or forgotten, users should contact the
      system administrator for assistance.
    </p>
  </article>
);

const OVERVIEW_FEATURES = [
  {
    title: 'Asset Registration',
    desc: 'Users can add new assets into the system with detailed information such as asset name, category, serial number, purchase date, value, and location.',
  },
  {
    title: 'Asset Tracking',
    desc: 'The system enables real-time tracking of asset locations and assignments to departments or employees.',
  },
  {
    title: 'Asset Assignment',
    desc: 'Assets can be assigned or transferred between users, departments, or locations while maintaining a complete history of transactions.',
  },
  {
    title: 'Maintenance Management',
    desc: 'Users can schedule and track asset maintenance activities to ensure proper functioning and extend asset lifespan.',
  },
  {
    title: 'Reporting and Analytics',
    desc: 'The system generates reports on asset inventory, usage, depreciation, maintenance history, and asset status.',
  },
  {
    title: 'User Management',
    desc: 'Administrators can create and manage user accounts, define roles, and assign system permissions.',
  },
];

const OVERVIEW_DASHBOARD_ITEMS = [
  'Total number of assets',
  'Assigned and unassigned assets',
  'Assets under maintenance',
  'Recently added or updated assets',
];

const OVERVIEW_CONTENT = (
  <article className={manualArticle}>
    <p className={manualPara}>
      The Asset Management System provides a centralized platform for tracking
      and managing all organizational assets. It allows users to record asset
      details, monitor asset movement, track maintenance schedules, and generate
      reports.
    </p>

    <h3 className={manualSectionTitle}>
      <span className={manualSectionAccent} />
      Key Features
    </h3>
    <ul className={`${manualListGap} mb-6`}>
      {OVERVIEW_FEATURES.map((item, i) => (
        <li key={i} className={manualListItem}>
          <span className={manualListNumber}>{i + 1}</span>
          <span>
            <strong className="text-foreground">{item.title}</strong>
            <span className="block mt-0.5">{item.desc}</span>
          </span>
        </li>
      ))}
    </ul>

    <h3 className={manualSectionTitle}>
      <span className={manualSectionAccent} />
      Dashboard Overview
    </h3>
    <p className={`${manualBody} mb-4`}>
      After logging in, users are directed to the Dashboard, which provides a
      summary of asset information such as:
    </p>
    <ul className={`${manualListGap} mb-6`}>
      {OVERVIEW_DASHBOARD_ITEMS.map((item, i) => (
        <li key={i} className={manualListItem}>
          <span className={manualListNumber}>{i + 1}</span>
          {item}
        </li>
      ))}
    </ul>
    <p className={manualParaLast}>
      The dashboard helps users quickly understand the current status of assets
      within the organization.
    </p>
  </article>
);

const REGISTRATION_CONTENT = (
  <article className={manualArticle}>
    <div className="mb-8 flex flex-col items-center gap-3">
      <div className="flex items-center gap-3">
        <span className="h-px w-8 bg-red-400/60" />
        <span className="text-xs font-bold text-red-600 tracking-[0.15em] uppercase">
          Video Guide
        </span>
        <span className="h-px w-8 bg-red-400/60" />
      </div>
      <p className="text-sm font-medium text-muted-foreground -mt-1">
        Watch the tutorial then follow the steps below
      </p>
      <video
        src="/videos/registration.mp4"
        controls
        muted
        playsInline
        className="w-full max-w-2xl rounded-xl border border-border/60 shadow-lg"
      >
        Your browser does not support the video tag.
      </video>
    </div>

    <div className="space-y-6 rounded-lg border border-border/40 bg-background/50 p-5 sm:p-6">
      <h3 className={manualSectionTitle}>
        <span className={manualSectionAccent} />
        Step-by-Step Instructions
      </h3>

      <ol className={manualListGap}>
        <li className={manualListItem}>
          <span className={manualListNumber}>1</span>
          <span className="text-foreground/85">
            First open any browser (suggested: Edge or Chrome).
          </span>
        </li>
        <li className={manualListItem}>
          <span className={manualListNumber}>2</span>
          <span className="text-foreground/85">
            Access the site at{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono text-red-600">
              http://200.2.4.32:9669
            </code>
            .
          </span>
        </li>
        <li className={manualListItem}>
          <span className={manualListNumber}>3</span>
          <span className="text-foreground/85">
            Click the <strong>Create account</strong> button under the Log in
            button.
          </span>
        </li>
      </ol>
      <figure className="flex justify-center">
        <img
          src={reg1Img}
          alt="Registration page - Create account button"
          className="w-full max-w-2xl rounded-lg border border-border object-contain shadow-sm"
        />
      </figure>
    </div>

    <div className="mt-6 space-y-6 rounded-lg border border-border/40 bg-background/50 p-5 sm:p-6">
      <ol start={4} className={manualListGap}>
        <li className={manualListItem}>
          <span className={manualListNumber}>4</span>
          <span className="text-foreground/85">
            Now fill up all the required fields in the registration form.
          </span>
        </li>
        <li className={manualListItem}>
          <span className={manualListNumber}>5</span>
          <span className="text-foreground/85">
            After filling up all the fields in the registration form, click{' '}
            <strong>Create account</strong>.
          </span>
        </li>
      </ol>
      <figure className="flex justify-center">
        <img
          src={reg2Img}
          alt="Registration form - Create account"
          className="w-full max-w-2xl rounded-lg border border-border object-contain shadow-sm"
        />
      </figure>
    </div>

    <div className="mt-6 space-y-6 rounded-lg border border-border/40 bg-background/50 p-5 sm:p-6">
      <ol start={6} className={manualListGap}>
        <li className={manualListItem}>
          <span className={manualListNumber}>6</span>
          <span className="text-foreground/85">
            Check your email address and look for an email from{' '}
            <strong>it.github@theblackcoders.com</strong> that contains your
            verification code.
          </span>
        </li>
        <li className={manualListItem}>
          <span className={manualListNumber}>7</span>
          <span className="text-foreground/85">
            Enter your verification code in the <strong>Verify Email</strong>{' '}
            fields.
          </span>
        </li>
        <li className={manualListItem}>
          <span className={manualListNumber}>8</span>
          <span className="text-foreground/85">
            Click <strong>Verify Email</strong>. Your account is now created.
            Wait for the system administrator to assign role and module access.
          </span>
        </li>
      </ol>
      <figure className="flex justify-center">
        <img
          src={reg4Img}
          alt="Verify Email - verification code"
          className="w-full max-w-2xl rounded-lg border border-border object-contain shadow-sm"
        />
      </figure>
    </div>
  </article>
);

const LOGIN_CONTENT = (
  <article className={manualArticle}>
    <div className="mb-6 flex flex-col items-center gap-2">
      <div className="flex items-center gap-3">
        <span className="h-px w-8 bg-red-400/60" />
        <span className="text-xs font-bold text-red-600 tracking-[0.15em] uppercase">
          Video Guide
        </span>
        <span className="h-px w-8 bg-red-400/60" />
      </div>
      <video
        src="/videos/login.mp4"
        controls
        muted
        playsInline
        className="w-full max-w-2xl rounded-xl border border-border/60 shadow-lg"
      >
        Your browser does not support the video tag.
      </video>
    </div>
    <ol className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>1</span>
        <span>Enter Email and password in the Login form.</span>
      </li>
      <li className={manualListItem}>
        <span className={manualListNumber}>2</span>
        <span>
          Click <strong>Login</strong> after entering Email and password.
        </span>
      </li>
    </ol>
    <figure className="mb-0 flex justify-center">
      <img
        src={log1Img}
        alt="Login form"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
  </article>
);

const FORGOT_PASSWORD_CONTENT = (
  <article className={manualArticle}>
    <div className="mb-6 flex flex-col items-center gap-2">
      <div className="flex items-center gap-3">
        <span className="h-px w-8 bg-red-400/60" />
        <span className="text-xs font-bold text-red-600 tracking-[0.15em] uppercase">
          Video Guide
        </span>
        <span className="h-px w-8 bg-red-400/60" />
      </div>
      <video
        src="/videos/forgotpw.mp4"
        controls
        muted
        playsInline
        className="w-full max-w-2xl rounded-xl border border-border/60 shadow-lg"
      >
        Your browser does not support the video tag.
      </video>
    </div>
    <ol className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>1</span>
        <span>
          Click the <strong>Forgot password?</strong> link on the Log in page
          under the password field.
        </span>
      </li>
    </ol>
    <figure className="mb-6 flex justify-center">
      <img
        src={forgot1Img}
        alt="Forgot password link on login page"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
    <ol start={2} className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>2</span>
        <span>
          Enter your email and click <strong>Send reset code</strong>.
        </span>
      </li>
    </ol>
    <figure className="mb-6 flex justify-center">
      <img
        src={forgot2Img}
        alt="Send reset code"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
    <ol start={3} className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>3</span>
        <span>
          Check your email and look for an email from{' '}
          <strong>it.github@theblackcoders.com</strong>. Copy the OTP and paste
          it in the OTP field, then click <strong>Verify</strong>.
        </span>
      </li>
    </ol>
    <figure className="mb-6 flex justify-center">
      <img
        src={forgot3Img}
        alt="OTP verification"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
    <ol start={4} className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>4</span>
        <span>
          If no email is received, click the <strong>Resend OTP</strong> button
          and go back to step 3.
        </span>
      </li>
    </ol>
    <figure className="mb-0 flex justify-center">
      <img
        src={forgot4Img}
        alt="Resend OTP"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
  </article>
);

const PROFILE_CONTENT = (
  <article className={manualArticle}>
    <div className="mb-6 flex flex-col items-center gap-2">
      <div className="flex items-center gap-3">
        <span className="h-px w-8 bg-red-400/60" />
        <span className="text-xs font-bold text-red-600 tracking-[0.15em] uppercase">
          Video Guide
        </span>
        <span className="h-px w-8 bg-red-400/60" />
      </div>
      <video
        src="/videos/goingtoprofile.mp4"
        controls
        muted
        playsInline
        className="w-full max-w-2xl rounded-xl border border-border/60 shadow-lg"
      >
        Your browser does not support the video tag.
      </video>
    </div>
    <ol className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>1</span>
        <span>Click the big circle profile in the sidebar.</span>
      </li>
    </ol>
    <figure className="mb-0 flex justify-center">
      <img
        src={profile1Img}
        alt="Profile in sidebar"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
  </article>
);

const EDIT_PROFILE_CONTENT = (
  <article className={manualArticle}>
    <div className="mb-6 flex flex-col items-center gap-2">
      <div className="flex items-center gap-3">
        <span className="h-px w-8 bg-red-400/60" />
        <span className="text-xs font-bold text-red-600 tracking-[0.15em] uppercase">
          Video Guide
        </span>
        <span className="h-px w-8 bg-red-400/60" />
      </div>
      <video
        src="/videos/editprofile.mp4"
        controls
        muted
        playsInline
        className="w-full max-w-2xl rounded-xl border border-border/60 shadow-lg"
      >
        Your browser does not support the video tag.
      </video>
    </div>
    <ol className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>1</span>
        <span>
          Click the <strong>Edit profile</strong> button.
        </span>
      </li>
    </ol>
    <figure className="mb-6 flex justify-center">
      <img
        src={profile2Img}
        alt="Edit profile button"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
    <ol start={2} className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>2</span>
        <span>Edit all the fields.</span>
      </li>
    </ol>
    <figure className="mb-6 flex justify-center">
      <img
        src={profile3Img}
        alt="Edit profile fields"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
    <ol start={3} className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>3</span>
        <span>
          Click <strong>Save</strong> to save all changes.
        </span>
      </li>
    </ol>
    <figure className="mb-6 flex justify-center">
      <img
        src={profile4Img}
        alt="Save button"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
    <ol start={4} className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>4</span>
        <span>
          Click <strong>Yes, Saved Changes</strong>.
        </span>
      </li>
    </ol>
    <figure className="mb-0 flex justify-center">
      <img
        src={profile5Img}
        alt="Yes, Saved Changes"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
  </article>
);

const DIGITAL_SIGNATURE_CONTENT = (
  <article className={manualArticle}>
    <div className="mb-6 flex flex-col items-center gap-2">
      <div className="flex items-center gap-3">
        <span className="h-px w-8 bg-red-400/60" />
        <span className="text-xs font-bold text-red-600 tracking-[0.15em] uppercase">
          Video Guide
        </span>
        <span className="h-px w-8 bg-red-400/60" />
      </div>
      <video
        src="/videos/adding_editing e signiture.mp4"
        controls
        muted
        playsInline
        className="w-full max-w-2xl rounded-xl border border-border/60 shadow-lg"
      >
        Your browser does not support the video tag.
      </video>
    </div>
    <p className="mb-4 text-muted-foreground">
      Your <strong>digital initials</strong> serve as your official electronic
      signature on all forms generated and processed within this system. Once
      set, your initials will appear on every form you approve, submit, or sign.
    </p>
    <ul className="mb-4 list-disc list-inside space-y-2 text-muted-foreground">
      <li>
        Go to your <strong>Profile</strong> page and open the{' '}
        <strong>Basic Info</strong> tab.
      </li>
      <li>
        Scroll to the <strong>Digital Initials</strong> section and click{' '}
        <strong>Edit Profile</strong>.
      </li>
      <li>
        Use the drawing canvas to hand-draw your initials.
      </li>
      <li>
        Click <strong>Save</strong>. A consent dialog will appear — read and
        check all acknowledgement boxes, then confirm.
      </li>
    </ul>
    <p className="mb-0 text-muted-foreground">
      Every use of your initials is secured via{' '}
      <strong>SMS OTP / MFA verification</strong>. Any form bearing your
      initials is considered <strong>official and legally binding</strong>
      within this system. See the{' '}
      <strong>
        Policy — Digital Initials and SMS OTP / MFA Verification
      </strong>{' '}
      for full details.
    </p>
  </article>
);

const ACCOUNT_TAB_CONTENT = (
  <article className={manualArticle}>
    <div className="mb-6 flex flex-col items-center gap-2">
      <div className="flex items-center gap-3">
        <span className="h-px w-8 bg-red-400/60" />
        <span className="text-xs font-bold text-red-600 tracking-[0.15em] uppercase">
          Video Guide
        </span>
        <span className="h-px w-8 bg-red-400/60" />
      </div>
      <video
        src="/videos/changepassword.mp4"
        controls
        muted
        playsInline
        className="w-full max-w-2xl rounded-xl border border-border/60 shadow-lg"
      >
        Your browser does not support the video tag.
      </video>
    </div>
    <ol className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>1</span>
        <span>
          Click the <strong>Account</strong> tab.
        </span>
      </li>
    </ol>
    <figure className="mb-6 flex justify-center">
      <img
        src={profile11Img}
        alt="Account tab"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
    <ol start={2} className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>2</span>
        <span>
          To reset password, fill up all the change password fields and click
          the <strong>Change password</strong> button.
        </span>
      </li>
    </ol>
    <figure className="mb-0 flex justify-center">
      <img
        src={profile12Img}
        alt="Change password"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
  </article>
);

const DOCUMENTS_TAB_CONTENT = (
  <article className={manualArticle}>
    <ol className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>1</span>
        <span>
          Click the <strong>Documents</strong> tab.
        </span>
      </li>
    </ol>
    <figure className="mb-0 flex justify-center">
      <img
        src={profile13Img}
        alt="Documents tab"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
  </article>
);

const ACCOUNTABILITY_FORM_CONTENT = (
  <article className={manualArticle}>
    <ol className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>1</span>
        <span>
          In the accountability forms section, all your accountability forms
          will be shown. Click the <strong>Active</strong> button to show the
          latest accountability form.
        </span>
      </li>
    </ol>
    <figure className="mb-6 flex justify-center">
      <img
        src={profile14Img}
        alt="Accountability forms section"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
    <ol start={2} className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>2</span>
        <span>
          Click <strong>View</strong> to review your accountability.
        </span>
      </li>
    </ol>
    <figure className="mb-6 flex justify-center">
      <img
        src={accountability1Img}
        alt="View accountability"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
    <ol start={3} className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>3</span>
        <span>
          Click <strong>Sign</strong> button to sign your accountability.
        </span>
      </li>
    </ol>
    <figure className="mb-6 flex justify-center">
      <img
        src={accountability2Img}
        alt="Sign button"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
    <ol start={4} className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>4</span>
        <span>
          Check all the verification boxes, make sure that all in the list are
          correct and all are in your possession, then click{' '}
          <strong>Sign</strong> button.
        </span>
      </li>
    </ol>
    <figure className="mb-6 flex justify-center">
      <img
        src={accountability5Img}
        alt="Verification and sign"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
    <ol start={5} className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>5</span>
        <span>
          To download the accountability form, click the{' '}
          <strong>Download</strong> button.
        </span>
      </li>
    </ol>
    <figure className="mb-0 flex justify-center">
      <img
        src={accountability3Img}
        alt="Download accountability form"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
  </article>
);

const RETURN_FORM_CONTENT = (
  <article className={manualArticle}>
    <ol className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>1</span>
        <span>
          In the return forms section, all the return forms of the user will be
          displayed here.
        </span>
      </li>
    </ol>
    <figure className="mb-0 flex justify-center">
      <img
        src={profile15Img}
        alt="Return forms section"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
  </article>
);

const TRANSFER_FORM_CONTENT = (
  <article className={manualArticle}>
    <ol className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>1</span>
        <span>
          In the transfer form section, all the transfer forms of the user will
          be displayed here.
        </span>
      </li>
    </ol>
    <figure className="mb-0 flex justify-center">
      <img
        src={profile16Img}
        alt="Transfer form section"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
  </article>
);

const MY_ASSETS_CONTENT = (
  <article className={manualArticle}>
    <ol className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>1</span>
        <span>
          Click <strong>My assets</strong> in the sidebar.
        </span>
      </li>
    </ol>
    <figure className="mb-6 flex justify-center">
      <img
        src={my1Img}
        alt="My assets in sidebar"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
    <ol start={2} className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>2</span>
        <span>
          On this page, all assigned assets of the user will be displayed.
        </span>
      </li>
    </ol>
    <figure className="mb-0 flex justify-center">
      <img
        src={my2Img}
        alt="My assets page"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
  </article>
);

const ASSET_ACCOUNTABILITY_FORMS_CONTENT = (
  <article className={manualArticle}>
    <ol className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>1</span>
        <span>
          Click <strong>My assets</strong> in the sidebar.
        </span>
      </li>
    </ol>
    <figure className="mb-6 flex justify-center">
      <img
        src={my1Img}
        alt="My assets in sidebar"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
    <ol start={2} className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>2</span>
        <span>
          Click the <strong>My accountability forms</strong> button to see all
          the accountability forms.
        </span>
      </li>
    </ol>
    <figure className="mb-6 flex justify-center">
      <img
        src={my3Img}
        alt="My accountability forms button"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
    <ol start={3} className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>3</span>
        <span>
          In the accountability forms section, all your accountability forms
          will be shown. Click the <strong>Active</strong> button to show the
          latest accountability form.
        </span>
      </li>
      <li className={manualListItem}>
        <span className={manualListNumber}>4</span>
        <span>
          Click <strong>View</strong> to review your accountability.
        </span>
      </li>
    </ol>
    <figure className="mb-6 flex justify-center">
      <img
        src={accountability1Img}
        alt="View accountability"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
    <ol start={5} className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>5</span>
        <span>
          Click <strong>Sign</strong> button to sign your accountability.
        </span>
      </li>
    </ol>
    <figure className="mb-6 flex justify-center">
      <img
        src={accountability2Img}
        alt="Sign button"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
    <ol start={6} className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>6</span>
        <span>
          Check all the verification boxes, make sure that all in the list are
          correct and all are in your possession, then click{' '}
          <strong>Sign</strong> button.
        </span>
      </li>
    </ol>
    <figure className="mb-6 flex justify-center">
      <img
        src={accountability5Img}
        alt="Verification and sign"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
    <ol start={7} className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>7</span>
        <span>
          To download the accountability form, click the{' '}
          <strong>Download</strong> button.
        </span>
      </li>
    </ol>
    <figure className="mb-0 flex justify-center">
      <img
        src={accountability3Img}
        alt="Download accountability form"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
  </article>
);

const ADDING_ASSETS_CONTENT = (
  <article className={manualArticle}>
    <div className="mb-6 flex flex-col items-center gap-2">
      <div className="flex items-center gap-3">
        <span className="h-px w-8 bg-red-400/60" />
        <span className="text-xs font-bold text-red-600 tracking-[0.15em] uppercase">
          Video Guide
        </span>
        <span className="h-px w-8 bg-red-400/60" />
      </div>
      <video
        src="/videos/adding-of-asset.mp4"
        controls
        muted
        playsInline
        className="w-full max-w-2xl rounded-xl border border-border/60 shadow-lg"
      >
        Your browser does not support the video tag.
      </video>
    </div>
    <ol className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>1</span>
        <span>
          In the sidebar, click <strong>Asset list</strong>.
        </span>
      </li>
    </ol>
    <figure className="mb-6 flex justify-center">
      <img
        src={add1Img}
        alt="Asset list in sidebar"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
    <ol start={2} className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>2</span>
        <span>
          Click the <strong>Add asset</strong> button.
        </span>
      </li>
    </ol>
    <figure className="mb-6 flex justify-center">
      <img
        src={add2Img}
        alt="Add asset button"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
    <ol start={3} className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>3</span>
        <span>In the Add asset modal, Step 1, fill up all the fields.</span>
      </li>
    </ol>
    <figure className="mb-6 flex justify-center">
      <img
        src={add3Img}
        alt="Add asset Step 1"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
    <ol start={4} className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>4</span>
        <span>
          Click the <strong>Next</strong> button to move to Step 2.
        </span>
      </li>
    </ol>
    <figure className="mb-6 flex justify-center">
      <img
        src={add4Img}
        alt="Next to Step 2"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
    <ol start={5} className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>5</span>
        <span>In Step 2, fill up all the lifecycle info of the asset.</span>
      </li>
    </ol>
    <figure className="mb-6 flex justify-center">
      <img
        src={add7Img}
        alt="Step 2 lifecycle info"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
    <div className={`${manualListGap} mb-6 ml-6`}>
      <div className={manualListItem}>
        <span className={manualListNumber}>5.1</span>
        <span>
          If the asset lifecycle info is unknown, turn on the{' '}
          <strong>Old unit unknown purchase date and asset value</strong>{' '}
          switch.
        </span>
      </div>
    </div>
    <figure className="mb-6 flex justify-center">
      <img
        src={add6Img}
        alt="Old unit unknown switch"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
    <ol start={6} className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>6</span>
        <span>
          Fill up all the remaining fields and click the <strong>Next</strong>{' '}
          button.
        </span>
      </li>
    </ol>
    <figure className="mb-6 flex justify-center">
      <img
        src={add8Img}
        alt="Step 2 remaining fields"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
    <ol start={7} className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>7</span>
        <span>
          In Step 3, Location and assignment, fill up all the fields and click
          the <strong>Next</strong> button.
        </span>
      </li>
    </ol>
    <figure className="mb-6 flex justify-center">
      <img
        src={add9Img}
        alt="Step 3 Location and assignment"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
    <ol start={8} className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>8</span>
        <span>
          In Step 4, review all the asset details and click the{' '}
          <strong>Complete and add asset</strong> button.
        </span>
      </li>
    </ol>
    <figure className="mb-0 flex justify-center">
      <img
        src={add10Img}
        alt="Step 4 Complete and add asset"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
  </article>
);

const EDITING_ASSET_CONTENT = (
  <article className={manualArticle}>
    <div className="mb-6 flex flex-col items-center gap-2">
      <div className="flex items-center gap-3">
        <span className="h-px w-8 bg-red-400/60" />
        <span className="text-xs font-bold text-red-600 tracking-[0.15em] uppercase">
          Video Guide
        </span>
        <span className="h-px w-8 bg-red-400/60" />
      </div>
      <video
        src="/videos/editiing asset.mp4"
        controls
        muted
        playsInline
        className="w-full max-w-2xl rounded-xl border border-border/60 shadow-lg"
      >
        Your browser does not support the video tag.
      </video>
    </div>
    <p className={manualPara}>
      After an asset is added, you can update its details at any time. The
      editing flow reuses the same steps as adding an asset.
    </p>
    <ol className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>1</span>
        <span>
          In <strong>Asset list</strong>, locate the asset and click{' '}
          <strong>Edit</strong>.
        </span>
      </li>
      <li className={manualListItem}>
        <span className={manualListNumber}>2</span>
        <span>Update the fields in each step (1–3) and review in Step 4.</span>
      </li>
      <li className={manualListItem}>
        <span className={manualListNumber}>3</span>
        <span>
          Click <strong>Save</strong> to apply the changes.
        </span>
      </li>
    </ol>
  </article>
);

const EDITING_ASSET_FINANCE_CONTENT = (
  <article className={manualArticle}>
    <div className="mb-6 flex flex-col items-center gap-2">
      <div className="flex items-center gap-3">
        <span className="h-px w-8 bg-red-400/60" />
        <span className="text-xs font-bold text-red-600 tracking-[0.15em] uppercase">
          Video Guide
        </span>
        <span className="h-px w-8 bg-red-400/60" />
      </div>
      <video
        src="/videos/financeasset editing.mp4"
        controls
        muted
        playsInline
        className="w-full max-w-2xl rounded-xl border border-border/60 shadow-lg"
      >
        Your browser does not support the video tag.
      </video>
    </div>
    <p className={manualPara}>
      Finance-level editing covers value, depreciation, and lifecycle fields
      that are restricted to users with finance permissions.
    </p>
    <ol className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>1</span>
        <span>
          Open the asset and go to the <strong>Finance / Lifecycle</strong>{' '}
          section.
        </span>
      </li>
      <li className={manualListItem}>
        <span className={manualListNumber}>2</span>
        <span>
          Update purchase date, asset value, depreciation, or related finance
          fields.
        </span>
      </li>
      <li className={manualListItem}>
        <span className={manualListNumber}>3</span>
        <span>
          Click <strong>Save</strong> and verify the updated finance details.
        </span>
      </li>
    </ol>
  </article>
);

const ASSET_TAGGING_CONTENT = (
  <article className={manualArticle}>
    <ol className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>1</span>
        <span>
          In the sidebar, click <strong>Asset tagging</strong>.
        </span>
      </li>
    </ol>
    <figure className="mb-6 flex justify-center">
      <img
        src={tag1Img}
        alt="Asset tagging in sidebar"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
    <ol start={2} className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>2</span>
        <span>Select the asset you want to generate an asset tag for.</span>
      </li>
    </ol>
    <figure className="mb-6 flex justify-center">
      <img
        src={tag2Img}
        alt="Select asset for tag"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
    <ol start={3} className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>3</span>
        <span>
          Click the <strong>Generate Tag</strong> button, then click{' '}
          <strong>Download PDF</strong>.
        </span>
      </li>
    </ol>
    <figure className="mb-0 flex justify-center">
      <img
        src={tag3Img}
        alt="Generate Tag and Download PDF"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
  </article>
);

const ASSET_ASSIGNMENT_CONTENT = (
  <article className={manualArticle}>
    <ol className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>1</span>
        <span>
          In the sidebar, click <strong>Asset assignment</strong>.
        </span>
      </li>
    </ol>
    <figure className="mb-6 flex justify-center">
      <img
        src={assign3Img}
        alt="Asset assignment in sidebar"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
    <ol start={2} className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>2</span>
        <span>
          Select the asset or asset build to assign, fill up the assignment
          details fields, and click the <strong>Assign asset</strong> button.
        </span>
      </li>
    </ol>
    <figure className="mb-6 flex justify-center">
      <img
        src={assign1Img}
        alt="Assign asset - assignment details"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
    <ol start={3} className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>3</span>
        <span>
          Tick all the verification checkboxes and click the{' '}
          <strong>Assign asset</strong> button.
        </span>
      </li>
    </ol>
    <figure className="mb-0 flex justify-center">
      <img
        src={assign2Img}
        alt="Verification and Assign asset"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
  </article>
);

const ASSET_RETURN_REQUEST_CONTENT = (
  <article className={manualArticle}>
    <p className={manualPara}>
      In this section, the user will request to return the asset assigned to
      him/her.
    </p>
    <ol className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>1</span>
        <span>
          In the sidebar, click <strong>Return request</strong>.
        </span>
      </li>
    </ol>
    <figure className="mb-6 flex justify-center">
      <img
        src={returnreq1Img}
        alt="Return request in sidebar"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
    <ol start={2} className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>2</span>
        <span>
          Select the asset or asset build to return, fill up all the fields in
          the return request details, and click the{' '}
          <strong>Submit return request</strong> button.
        </span>
      </li>
    </ol>
    <figure className="mb-6 flex justify-center">
      <img
        src={returnreq2Img}
        alt="Return request details"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
    <ol start={3} className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>3</span>
        <span>
          In the return request confirmation, tick all the verification
          checkboxes and click the <strong>Submit</strong> button.
        </span>
      </li>
    </ol>
    <figure className="mb-6 flex justify-center">
      <img
        src={returnreq3Img}
        alt="Return request confirmation"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
    <ol start={4} className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>4</span>
        <span>
          To view your return request, click the <strong>Request</strong> button
          in the header.
        </span>
      </li>
    </ol>
    <figure className="mb-6 flex justify-center">
      <img
        src={returnreq4Img}
        alt="Request button in header"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
    <ol start={5} className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>5</span>
        <span>
          On the My asset return request page, all return requests, details, and
          timeline of the request will be displayed there.
        </span>
      </li>
    </ol>
    <figure className="mb-0 flex justify-center">
      <img
        src={returnreq5Img}
        alt="My asset return request page"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
  </article>
);

const RETURN_REQUEST_CONTENT = (
  <article className={manualArticle}>
    <p className={manualPara}>
      This is where the asset manager will approve and process all return
      requests of users after the request is approved by their respective
      department head.
    </p>
    <ol className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>1</span>
        <span>
          Click <strong>Return request</strong> in the sidebar.
        </span>
      </li>
    </ol>
    <figure className="mb-6 flex justify-center">
      <img
        src={return1Img}
        alt="Return request in sidebar"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
    <ol start={2} className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>2</span>
        <span>
          Click the <strong>Request</strong> button in the header.
        </span>
      </li>
    </ol>
    <figure className="mb-6 flex justify-center">
      <img
        src={return2Img}
        alt="Request button in header"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
    <ol start={3} className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>3</span>
        <span>
          On the return request page, all requests from users will be displayed.
        </span>
      </li>
    </ol>
    <ol start={4} className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>4</span>
        <span>
          Click the <strong>View/Return asset</strong> button.
        </span>
      </li>
    </ol>
    <figure className="mb-6 flex justify-center">
      <img
        src={return3Img}
        alt="View/Return asset button"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
    <ol start={5} className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>5</span>
        <span>Fill up all the fields in the Asset Return Confirmation.</span>
      </li>
    </ol>
    <figure className="mb-6 flex justify-center">
      <img
        src={return4Img}
        alt="Asset Return Confirmation"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
    <ol start={6} className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>6</span>
        <span>
          Tick all the checkboxes in the verification and click the{' '}
          <strong>Return</strong> button.
        </span>
      </li>
    </ol>
    <figure className="mb-0 flex justify-center">
      <img
        src={return5Img}
        alt="Verification and Return button"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
  </article>
);

const ASSET_TRANSFER_REQUEST_CONTENT = (
  <article className={manualArticle}>
    <p className={manualPara}>
      In this section, the user will request to transfer an asset assigned to
      him/her to another user.
    </p>
    <ol className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>1</span>
        <span>
          In the sidebar, click <strong>Transfer request</strong>.
        </span>
      </li>
    </ol>
    <figure className="mb-6 flex justify-center">
      <img
        src={transferreq1Img}
        alt="Transfer request in sidebar"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
    <ol start={2} className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>2</span>
        <span>
          On the transfer request page, select the asset or asset build to
          transfer, fill up the transfer request details, and click{' '}
          <strong>Submit transfer</strong>.
        </span>
      </li>
    </ol>
    <figure className="mb-6 flex justify-center">
      <img
        src={transferreq2Img}
        alt="Transfer request details"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
    <ol start={3} className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>3</span>
        <span>
          In the confirm transfer request, click the <strong>Confirm</strong>{' '}
          button.
        </span>
      </li>
    </ol>
    <figure className="mb-6 flex justify-center">
      <img
        src={transferreq3Img}
        alt="Confirm transfer request"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
    <ol start={4} className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>4</span>
        <span>
          To view your asset transfer request, on the asset transfer request
          page click the <strong>My request</strong> button in the header.
        </span>
      </li>
    </ol>
    <figure className="mb-6 flex justify-center">
      <img
        src={transferreq4Img}
        alt="My request button in header"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
    <ol start={5} className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>5</span>
        <span>
          On the My transfer request page, all requests made by the user,
          transfer details, and timeline of the request are displayed.
        </span>
      </li>
    </ol>
    <figure className="mb-0 flex justify-center">
      <img
        src={transferreq5Img}
        alt="My transfer request page"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
  </article>
);

const TRANSFER_REQUEST_CONTENT = (
  <article className={manualArticle}>
    <p className={manualPara}>
      This is where the asset manager will approve and process all transfer
      requests of users after the request is approved by their respective
      department head.
    </p>
    <ol className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>1</span>
        <span>
          In the sidebar, click <strong>Transfer asset</strong>.
        </span>
      </li>
    </ol>
    <figure className="mb-6 flex justify-center">
      <img
        src={transfer1Img}
        alt="Transfer asset in sidebar"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
    <ol start={2} className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>2</span>
        <span>
          Click the <strong>Request</strong> button in the header.
        </span>
      </li>
    </ol>
    <figure className="mb-6 flex justify-center">
      <img
        src={transfer2Img}
        alt="Request button in header"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
    <ol start={3} className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>3</span>
        <span>This is where all requests will be shown.</span>
      </li>
    </ol>
    <ol start={4} className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>4</span>
        <span>
          Click the <strong>View and transfer</strong> button.
        </span>
      </li>
    </ol>
    <figure className="mb-6 flex justify-center">
      <img
        src={transfer3Img}
        alt="View and transfer button"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
    <ol start={5} className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>5</span>
        <span>
          Fill up all the Asset transfer confirmation fields and click the{' '}
          <strong>Transfer</strong> button.
        </span>
      </li>
    </ol>
    <figure className="mb-0 flex justify-center">
      <img
        src={transfer4Img}
        alt="Asset transfer confirmation"
        className="w-full max-w-2xl rounded-lg border border-border object-contain"
      />
    </figure>
  </article>
);

const ASSIGN_ROLE_CUSTODIAN_CONTENT = (
  <article className={manualArticle}>
    <div className="mb-6 flex flex-col items-center gap-2">
      <div className="flex items-center gap-3">
        <span className="h-px w-8 bg-red-400/60" />
        <span className="text-xs font-bold text-red-600 tracking-[0.15em] uppercase">
          Video Guide
        </span>
        <span className="h-px w-8 bg-red-400/60" />
      </div>
      <video
        src="/videos/assignrole and custodian access.mp4"
        controls
        muted
        playsInline
        className="w-full max-w-2xl rounded-xl border border-border/60 shadow-lg"
      >
        Your browser does not support the video tag.
      </video>
    </div>
    <p className={manualPara}>
      Assigning a role and custodian access controls what a user can see and
      manage within their assigned scope.
    </p>
    <ol className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>1</span>
        <span>
          Go to <strong>Settings → User</strong> and open the user record.
        </span>
      </li>
      <li className={manualListItem}>
        <span className={manualListNumber}>2</span>
        <span>
          In <strong>Assign role and custodian access</strong>, select the role
          and enable custodian access for the target scope.
        </span>
      </li>
      <li className={manualListItem}>
        <span className={manualListNumber}>3</span>
        <span>
          Click <strong>Save</strong> to apply the role and custodian settings.
        </span>
      </li>
    </ol>
  </article>
);

const ASSIGN_MODULE_PERMISSION_CONTENT = (
  <article className={manualArticle}>
    <div className="mb-6 flex flex-col items-center gap-2">
      <div className="flex items-center gap-3">
        <span className="h-px w-8 bg-red-400/60" />
        <span className="text-xs font-bold text-red-600 tracking-[0.15em] uppercase">
          Video Guide
        </span>
        <span className="h-px w-8 bg-red-400/60" />
      </div>
      <video
        src="/videos/assignmodulepermission.mp4"
        controls
        muted
        playsInline
        className="w-full max-w-2xl rounded-xl border border-border/60 shadow-lg"
      >
        Your browser does not support the video tag.
      </video>
    </div>
    <p className={manualPara}>
      Module permissions define which pages and actions a user can access.
    </p>
    <ol className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>1</span>
        <span>
          In the user record, open <strong>Assign module permission</strong>.
        </span>
      </li>
      <li className={manualListItem}>
        <span className={manualListNumber}>2</span>
        <span>
          Check the modules to grant (e.g., Asset List, Tagging, Assignment) and
          uncheck those to revoke.
        </span>
      </li>
      <li className={manualListItem}>
        <span className={manualListNumber}>3</span>
        <span>
          Click <strong>Save</strong> to update module access.
        </span>
      </li>
    </ol>
  </article>
);

const ASSIGN_APPROVER_CONTENT = (
  <article className={manualArticle}>
    <div className="mb-6 flex flex-col items-center gap-2">
      <div className="flex items-center gap-3">
        <span className="h-px w-8 bg-red-400/60" />
        <span className="text-xs font-bold text-red-600 tracking-[0.15em] uppercase">
          Video Guide
        </span>
        <span className="h-px w-8 bg-red-400/60" />
      </div>
      <video
        src="/videos/assignapproverandsubapprover for a user.mp4"
        controls
        muted
        playsInline
        className="w-full max-w-2xl rounded-xl border border-border/60 shadow-lg"
      >
        Your browser does not support the video tag.
      </video>
    </div>
    <p className={manualPara}>
      Approvers and sub-approvers are required for return, transfer, and
      disposal workflows.
    </p>
    <ol className={manualListGap}>
      <li className={manualListItem}>
        <span className={manualListNumber}>1</span>
        <span>
          In the user record, open <strong>Assign approver and sub-approver</strong>.
        </span>
      </li>
      <li className={manualListItem}>
        <span className={manualListNumber}>2</span>
        <span>
          Select the approver and, if needed, a sub-approver for the user’s
          department or scope.
        </span>
      </li>
      <li className={manualListItem}>
        <span className={manualListNumber}>3</span>
        <span>
          Click <strong>Save</strong> to link the approver chain to the user.
        </span>
      </li>
    </ol>
  </article>
);

export default function UserManual() {
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(COVER_STEP);
  const [expandedParents, setExpandedParents] = useState<Set<number>>(() => {
    const set = new Set<number>();
    STEP_PARENT_INDEX.forEach(p => {
      if (p >= 0) set.add(p);
    });
    return set;
  });

  useEffect(() => {
    const section = searchParams.get('section');
    const stepParam = searchParams.get('step');
    if (section === 'digital-initials' || section === 'digital_initials' || section === 'digitalInitials') {
      setCurrentStep(COVER_STEP + 9);
      return;
    }
    if (stepParam) {
      const n = Number(stepParam);
      if (!Number.isNaN(n) && n >= COVER_STEP && n <= MAX_STEP) {
        setCurrentStep(n);
        return;
      }
    }
    if (section === 'login') {
      setCurrentStep(COVER_STEP + 5);
    } else if (section === 'register') {
      setCurrentStep(COVER_STEP + 4);
    }
  }, [searchParams]);

  const toggleExpand = (parentIndex: number) => {
    setExpandedParents(prev => {
      const next = new Set(prev);
      if (next.has(parentIndex)) next.delete(parentIndex);
      else next.add(parentIndex);
      return next;
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <main className="flex-1 space-y-6 p-4 sm:p-6">
        <PageHeader
          icon={BookOpen}
          title="User Manual"
          description="Asset Management System - Complete Guide"
        >
        </PageHeader>

        <div className="flex flex-col gap-6 xl:flex-row">
          {/* Aside card: vertical stepper - fixed height, scrollable list */}
          <Card className="flex w-full shrink-0 flex-col xl:h-[42rem] xl:w-60 shadow-md border-border/50">
            <CardHeader className="h-20 flex-shrink-0 flex flex-row items-center gap-3 border-b bg-gradient-to-br from-red-600 to-red-700 text-white rounded-t-xl px-5 py-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm border border-white/20 shrink-0">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <div className="flex items-baseline gap-1.5 min-w-0">
                <CardTitle className="text-sm font-bold text-white leading-tight shrink-0">
                  Chapters
                </CardTitle>
                <span className="text-[11px] text-red-200/80 truncate">
                  ({STEPS})
                </span>
              </div>
            </CardHeader>
            <CardContent className="min-h-0 max-h-[24rem] flex-1 overflow-y-auto pt-3 px-3 pb-2 xl:max-h-none scrollbar-thin">
              <div className="relative flex flex-col pb-2">
                {Array.from({ length: STEPS }, (_, i) => {
                  const parentIdx = STEP_PARENT_INDEX[i];
                  if (parentIdx >= 0 && !expandedParents.has(parentIdx))
                    return null;

                  const stepperStep = i + 1;
                  const completed = currentStep > COVER_STEP + stepperStep;
                  const isActive = currentStep === COVER_STEP + stepperStep;
                  const title = STEP_TITLES[i] ?? `Step ${stepperStep}`;
                  const isLast = i === STEPS - 1;
                  const StepIcon = STEP_ICONS[i];
                  const stepTarget = COVER_STEP + stepperStep;
                  const isSub = STEP_IS_SUB[i];
                  const isSubSub = STEP_IS_SUB_SUB[i];
                  const hasChildren = stepHasChildren(i);
                  const isExpanded = hasChildren && expandedParents.has(i);

                  return (
                    <div
                      key={stepperStep}
                      className={`flex flex-col ${isSubSub ? 'ml-5 pl-2 border-l border-muted-foreground/20' : isSub ? 'ml-5' : ''}`}
                    >
                      <div className="flex items-center gap-1 w-full min-h-[2.25rem]">
                        <button
                          type="button"
                          onClick={() => setCurrentStep(stepTarget)}
                          className={`flex gap-2 items-center text-left flex-1 min-w-0 rounded-lg py-1.5 pl-2 pr-1 transition-all duration-200 cursor-pointer group relative ${
                            isActive
                              ? 'bg-red-50 dark:bg-red-950/30 shadow-sm'
                              : 'hover:bg-muted/60'
                          } ${isSub ? 'min-h-9' : ''}`}
                        >
                          {isActive && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-red-600" />
                          )}
                          <div className="relative z-10 flex flex-col items-center justify-center shrink-0">
                            <div
                              className={`rounded-full flex items-center justify-center border-2 transition-all duration-200 shrink-0 ${
                                isSub
                                  ? 'w-6 h-6 md:w-7 md:h-7'
                                  : 'w-10 h-10 md:w-11 md:h-11 border-2 md:border-4'
                              } ${
                                completed
                                  ? 'bg-green-500 text-white border-green-300 shadow-sm shadow-green-200'
                                  : isActive
                                    ? 'bg-red-600 text-white border-red-300 ring-2 ring-red-200 shadow-sm'
                                    : 'bg-gray-100 text-gray-400 border-gray-300 group-hover:border-red-300 group-hover:bg-gray-50'
                              }`}
                            >
                              {completed ? (
                                <CheckCircle2
                                  className={
                                    isSub
                                      ? 'h-3 w-3 md:h-3.5 md:w-3.5'
                                      : 'h-5 w-5 md:h-6 md:w-6'
                                  }
                                />
                              ) : StepIcon ? (
                                <StepIcon
                                  className={
                                    isSub
                                      ? 'h-2.5 w-2.5 md:h-3 md:w-3'
                                      : 'h-4 w-4 md:h-5 md:w-5'
                                  }
                                />
                              ) : null}
                            </div>
                          </div>
                          <p
                            className={`font-medium leading-snug flex-1 py-0.5 ${
                              isSub ? 'text-[11px]' : 'text-xs'
                            } ${
                              isActive
                                ? 'text-red-700 font-semibold'
                                : completed
                                  ? 'text-green-700'
                                  : 'text-gray-500 group-hover:text-red-600/80'
                            }`}
                          >
                            {title}
                          </p>
                        </button>
                        {hasChildren ? (
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              toggleExpand(i);
                            }}
                            className="shrink-0 flex items-center justify-center w-7 h-7 rounded hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                            aria-label={
                              isExpanded
                                ? 'Collapse sub-steps'
                                : 'Expand sub-steps'
                            }
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 shrink-0" />
                            ) : (
                              <ChevronDown className="h-4 w-4 shrink-0" />
                            )}
                          </button>
                        ) : null}
                      </div>
                      {(() => {
                        const nextVisible =
                          i + 1 < STEPS &&
                          (STEP_PARENT_INDEX[i + 1] < 0 ||
                            expandedParents.has(STEP_PARENT_INDEX[i + 1]));
                        return nextVisible ? (
                          <div
                            className={`w-1 min-h-3 rounded-full flex-shrink-0 ${
                              isSubSub
                                ? 'ml-[14px]'
                                : isSub
                                  ? 'ml-[10px]'
                                  : 'ml-[18px]'
                            } ${completed ? 'bg-green-500' : 'bg-gray-300'}`}
                            aria-hidden
                          />
                        ) : null;
                      })()}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Content card - cover (logo) or step content - fixed height, scrollable body */}
          <Card className="flex min-h-[32rem] min-w-0 flex-1 flex-col xl:h-[42rem] xl:max-h-[42rem] shadow-md border-border/50">
            <CardHeader className="h-20 flex-shrink-0 flex flex-row items-center justify-between bg-gradient-to-br from-red-600 to-red-700 text-white rounded-t-xl px-5 py-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm border border-white/20">
                  {(() => {
                    const stepI = currentStep - COVER_STEP - 1;
                    const Icon = STEP_ICONS[stepI];
                    return Icon ? (
                      <Icon className="h-4 w-4 text-white" />
                    ) : null;
                  })()}
                </div>
                <CardTitle className="text-sm sm:text-base font-bold text-white leading-tight truncate">
                  {currentStep === COVER_STEP + 1
                    ? 'Asset Management'
                    : currentStep === COVER_STEP + 2
                      ? 'Getting Started'
                      : currentStep === COVER_STEP + 3
                        ? 'System Overview'
                        : currentStep === COVER_STEP + 4
                          ? 'Registration'
                          : currentStep === COVER_STEP + 5
                            ? 'Log In'
                            : currentStep === COVER_STEP + 6
                              ? 'Forgot password'
                              : (STEP_TITLES[currentStep - COVER_STEP - 1] ??
                                'Asset Management Complete User Manual')}
                </CardTitle>
              </div>
              {currentStep > COVER_STEP && (
                <span className="shrink-0 flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-medium text-white/90 border border-white/10">
                  <span className="font-bold">{currentStep - COVER_STEP}</span>
                  <span className="text-white/50">/</span>
                  <span>{STEPS}</span>
                </span>
              )}
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 pt-4 sm:p-6 sm:pt-6">
              {currentStep === COVER_STEP + 1 ? (
                <div className="w-full text-left">{INTRODUCTION_CONTENT}</div>
              ) : currentStep === COVER_STEP + 2 ? (
                <div className="w-full text-left">
                  {GETTING_STARTED_CONTENT}
                </div>
              ) : currentStep === COVER_STEP + 3 ? (
                <div className="w-full text-left">{OVERVIEW_CONTENT}</div>
              ) : currentStep === COVER_STEP + 4 ? (
                <div className="w-full text-left">{REGISTRATION_CONTENT}</div>
              ) : currentStep === COVER_STEP + 5 ? (
                <div className="w-full text-left">{LOGIN_CONTENT}</div>
              ) : currentStep === COVER_STEP + 6 ? (
                <div className="w-full text-left">
                  {FORGOT_PASSWORD_CONTENT}
                </div>
              ) : currentStep === COVER_STEP + 7 ? (
                <div className="w-full text-left">{PROFILE_CONTENT}</div>
              ) : currentStep === COVER_STEP + 8 ? (
                <div className="w-full text-left">{EDIT_PROFILE_CONTENT}</div>
              ) : currentStep === COVER_STEP + 9 ? (
                <div className="w-full text-left">
                  {DIGITAL_SIGNATURE_CONTENT}
                </div>
              ) : currentStep === COVER_STEP + 10 ? (
                <div className="w-full text-left">{ACCOUNT_TAB_CONTENT}</div>
              ) : currentStep === COVER_STEP + 11 ? (
                <div className="w-full text-left">{DOCUMENTS_TAB_CONTENT}</div>
              ) : currentStep === COVER_STEP + 12 ? (
                <div className="w-full text-left">
                  {ACCOUNTABILITY_FORM_CONTENT}
                </div>
              ) : currentStep === COVER_STEP + 13 ? (
                <div className="w-full text-left">{RETURN_FORM_CONTENT}</div>
              ) : currentStep === COVER_STEP + 14 ? (
                <div className="w-full text-left">{TRANSFER_FORM_CONTENT}</div>
              ) : currentStep === COVER_STEP + 15 ? (
                <div className="w-full text-left">{MY_ASSETS_CONTENT}</div>
              ) : currentStep === COVER_STEP + 16 ? (
                <div className="w-full text-left">
                  {ASSET_ACCOUNTABILITY_FORMS_CONTENT}
                </div>
              ) : currentStep === COVER_STEP + 17 ? (
                <div className="w-full text-left">{ADDING_ASSETS_CONTENT}</div>
              ) : currentStep === COVER_STEP + 18 ? (
                <div className="w-full text-left">{EDITING_ASSET_CONTENT}</div>
              ) : currentStep === COVER_STEP + 19 ? (
                <div className="w-full text-left">
                  {EDITING_ASSET_FINANCE_CONTENT}
                </div>
              ) : currentStep === COVER_STEP + 20 ? (
                <div className="w-full text-left">{ASSET_TAGGING_CONTENT}</div>
              ) : currentStep === COVER_STEP + 21 ? (
                <div className="w-full text-left">
                  {ASSET_ASSIGNMENT_CONTENT}
                </div>
              ) : currentStep === COVER_STEP + 22 ? (
                <div className="w-full text-left">
                  {ASSET_RETURN_REQUEST_CONTENT}
                </div>
              ) : currentStep === COVER_STEP + 24 ? (
                <div className="w-full text-left">{RETURN_REQUEST_CONTENT}</div>
              ) : currentStep === COVER_STEP + 25 ? (
                <div className="w-full text-left">
                  {ASSET_TRANSFER_REQUEST_CONTENT}
                </div>
              ) : currentStep === COVER_STEP + 27 ? (
                <div className="w-full text-left">
                  {TRANSFER_REQUEST_CONTENT}
                </div>
              ) : currentStep === COVER_STEP + 33 ? (
                <div className="w-full text-left">
                  {ASSIGN_ROLE_CUSTODIAN_CONTENT}
                </div>
              ) : currentStep === COVER_STEP + 34 ? (
                <div className="w-full text-left">
                  {ASSIGN_MODULE_PERMISSION_CONTENT}
                </div>
              ) : currentStep === COVER_STEP + 35 ? (
                <div className="w-full text-left">
                  {ASSIGN_APPROVER_CONTENT}
                </div>
              ) : currentStep === COVER_STEP ? (
                <div className="flex-1 flex flex-col items-center justify-center w-full gap-4">
                  <img
                    src="/Blackcoders-Black.png"
                    alt="Blackcoders"
                    className="max-w-3xl w-full h-auto object-contain"
                  />
                </div>
              ) : (
                (() => {
                  const stepIndex = currentStep - COVER_STEP - 1;
                  const title = STEP_TITLES[stepIndex] ?? '';
                  const underDevelopmentTitles = [
                    'Asset maintenance',
                    'Asset repair',
                    'Asset disposal',
                    'Asset return',
                    'Asset transfer',
                    'Settings',
                    'User',
                  ];
                  const isUnderDevelopment =
                    underDevelopmentTitles.includes(title);
                  return (
                    <div className="w-full text-left">
                      <article className={manualArticle}>
                        {isUnderDevelopment ? (
                          <>
                            <p className={manualPara}>
                              <strong>{title}</strong>
                            </p>
                            <p className={manualParaLast}>
                              This section is currently under development.
                              Content will be available in a future update.
                            </p>
                          </>
                        ) : (
                          <p className={manualPara}>
                            This section covers <strong>{title}</strong>.
                            Content for this part of the user manual can be
                            added here.
                          </p>
                        )}
                      </article>
                    </div>
                  );
                })()
              )}
            </CardContent>
            <CardFooter className="flex flex-shrink-0 items-center justify-between border-t border-border/50 bg-muted/10 px-5 py-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep(s => Math.max(COVER_STEP, s - 1))}
                disabled={currentStep <= COVER_STEP}
                className="gap-1.5 border-border/60 text-sm font-medium hover:bg-red-600 hover:text-white hover:border-red-600 transition-all duration-200 disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Back
              </Button>

              {currentStep > COVER_STEP && currentStep <= MAX_STEP && (
                <div className="hidden sm:flex items-center gap-1.5">
                  {Array.from(
                    { length: STEPS },
                    (_, i) => i + 1,
                  ).map(step => (
                    <button
                      key={step}
                      type="button"
                      onClick={() =>
                        setCurrentStep(COVER_STEP + step)
                      }
                      className={`h-2 w-2 rounded-full transition-all duration-300 ${
                        step === currentStep - COVER_STEP
                          ? 'w-5 bg-red-600'
                          : step < currentStep - COVER_STEP
                            ? 'bg-green-400 hover:bg-green-500'
                            : 'bg-gray-300 hover:bg-gray-400'
                      }`}
                      aria-label={`Go to step ${step}`}
                    />
                  ))}
                </div>
              )}

              <Button
                size="sm"
                onClick={() => setCurrentStep(s => Math.min(MAX_STEP, s + 1))}
                disabled={currentStep >= MAX_STEP}
                className="gap-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  );
}
