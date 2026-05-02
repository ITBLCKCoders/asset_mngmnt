import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function UnauthorizedView() {
  const navigate = useNavigate();

  return (
    <TabsContent value="general" className="mt-8">
      <Card>
        <CardContent className="py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <LogIn className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mb-2 text-xl font-semibold">Sign in required</h3>
          <p className="mb-6 text-muted-foreground">
            You need to be logged in to manage companies
          </p>
          <Button onClick={() => navigate('/login')}>
            <LogIn className="mr-2 h-4 w-4" /> Go to Login
          </Button>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
