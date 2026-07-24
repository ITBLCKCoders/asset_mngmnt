import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FloatingHelpButtonProps {
  section: 'login' | 'register';
}

export default function FloatingHelpButton({ section }: FloatingHelpButtonProps) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleClick = () => {
    const base = isAuthenticated ? '/user-manual' : '/public/manual';
    navigate(`${base}?section=${section}`);
  };

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={handleClick}
            className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition-all hover:bg-red-700 hover:shadow-xl active:scale-95"
            aria-label="User Manual"
          >
            <span className="text-xl font-bold leading-none">?</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>User Manual</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
