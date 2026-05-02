import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';
import {
  AppAlertDialogChromeFooter,
  AppAlertDialogFrame,
  AppAlertDialogGradientHeader,
  AppAlertDialogMessage,
} from '@/components/common/appDialogChrome';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { User, Role } from '@/types/assets';

interface AlertDialogsProps {
  showCancelAlert: boolean;
  setShowCancelAlert: (show: boolean) => void;
  setIsOpen: (open: boolean) => void;
  deleting: User | null;
  setDeleting: (user: User | null) => void;
  handleDelete: () => void;
  rolesShowCancelAlert: boolean;
  setRolesShowCancelAlert: (show: boolean) => void;
  setRolesIsOpen: (open: boolean) => void;
  rolesDeleting: Role | null;
  setRolesDeleting: (role: Role | null) => void;
  handleRolesDelete: () => void;
}

export function AlertDialogs({
  showCancelAlert,
  setShowCancelAlert,
  setIsOpen,
  deleting,
  setDeleting,
  handleDelete,
  rolesShowCancelAlert,
  setRolesShowCancelAlert,
  setRolesIsOpen,
  rolesDeleting,
  setRolesDeleting,
  handleRolesDelete,
}: AlertDialogsProps) {
  return (
    <>
      <AlertDialog open={showCancelAlert} onOpenChange={setShowCancelAlert}>
        <AppAlertDialogFrame>
          <AppAlertDialogGradientHeader title="Cancel Edit?" />
          <AppAlertDialogMessage>
            <AlertDialogDescription className="text-base text-gray-600">
              All changes will be discarded.
            </AlertDialogDescription>
          </AppAlertDialogMessage>
          <AppAlertDialogChromeFooter>
            <AlertDialogCancel onClick={e => e.stopPropagation()}>
              Keep Editing
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={e => {
                e.stopPropagation();
                setShowCancelAlert(false);
                setIsOpen(false);
                toast.info('Changes discarded');
              }}
            >
              Discard Changes
            </AlertDialogAction>
          </AppAlertDialogChromeFooter>
        </AppAlertDialogFrame>
      </AlertDialog>

      <AlertDialog
        open={!!deleting}
        onOpenChange={open => !open && setDeleting(null)}
      >
        <AppAlertDialogFrame className="max-w-md">
          <AppAlertDialogGradientHeader
            title={
              <span className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 shrink-0 text-white" />
                Permanently Delete User?
              </span>
            }
          />
          <AppAlertDialogMessage>
            <AlertDialogDescription className="text-base text-gray-600">
              This action will remove{' '}
              <strong className="text-foreground">
                {deleting?.first_name} {deleting?.last_name}
              </strong>{' '}
              from the system.
              <br />
              <span className="text-sm text-muted-foreground">
                All associated data and permissions will be permanently lost.
              </span>
            </AlertDialogDescription>
          </AppAlertDialogMessage>
          <AppAlertDialogChromeFooter className="gap-3">
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl font-medium"
            >
              Yes, Delete User
            </AlertDialogAction>
          </AppAlertDialogChromeFooter>
        </AppAlertDialogFrame>
      </AlertDialog>

      <AlertDialog
        open={rolesShowCancelAlert}
        onOpenChange={setRolesShowCancelAlert}
      >
        <AppAlertDialogFrame>
          <AppAlertDialogGradientHeader title="Cancel Edit?" />
          <AppAlertDialogMessage>
            <AlertDialogDescription className="text-base text-gray-600">
              All changes will be discarded.
            </AlertDialogDescription>
          </AppAlertDialogMessage>
          <AppAlertDialogChromeFooter>
            <AlertDialogCancel onClick={e => e.stopPropagation()}>
              Keep Editing
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={e => {
                e.stopPropagation();
                setRolesShowCancelAlert(false);
                setRolesIsOpen(false);
                toast.info('Changes discarded');
              }}
            >
              Discard Changes
            </AlertDialogAction>
          </AppAlertDialogChromeFooter>
        </AppAlertDialogFrame>
      </AlertDialog>

      <AlertDialog
        open={!!rolesDeleting}
        onOpenChange={open => !open && setRolesDeleting(null)}
      >
        <AppAlertDialogFrame className="max-w-md">
          <AppAlertDialogGradientHeader
            title={
              <span className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 shrink-0 text-white" />
                Permanently Delete Role?
              </span>
            }
          />
          <AppAlertDialogMessage>
            <AlertDialogDescription className="text-base text-gray-600">
              This action will remove{' '}
              <strong className="text-foreground">{rolesDeleting?.name}</strong>{' '}
              from the system.
              <br />
              <span className="text-sm text-muted-foreground">
                Users with this role may lose access to certain features.
              </span>
            </AlertDialogDescription>
          </AppAlertDialogMessage>
          <AppAlertDialogChromeFooter className="gap-3">
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRolesDelete}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl font-medium"
            >
              Yes, Delete Role
            </AlertDialogAction>
          </AppAlertDialogChromeFooter>
        </AppAlertDialogFrame>
      </AlertDialog>
    </>
  );
}
