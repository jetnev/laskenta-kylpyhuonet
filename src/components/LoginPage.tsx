import { useState } from 'react';
import { SignIn, Key, Envelope } from '@phosphor-icons/react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { toast } from 'sonner';

interface LoginPageProps {
  onLogin: (email: string, password: string) => boolean;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Täytä kaikki kentät');
      return;
    }

    setIsLoading(true);
    
    setTimeout(() => {
      const success = onLogin(email, password);
      
      if (!success) {
        toast.error('Virheellinen sähköposti tai salasana');
      }
      
      setIsLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-accent/10 p-4 sm:p-6">
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 35px, oklch(0.88 0.005 250 / 0.3) 35px, oklch(0.88 0.005 250 / 0.3) 70px)`
        }}
      />
      
      <Card className="w-full max-w-md relative shadow-2xl border-border/50 backdrop-blur-sm bg-card/95">
        <CardHeader className="space-y-3 sm:space-y-4 text-center pb-6 sm:pb-8 px-4 sm:px-6">
          <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
            <SignIn className="w-7 h-7 sm:w-8 sm:h-8 text-primary-foreground" weight="bold" />
          </div>
          <div>
            <CardTitle className="text-2xl sm:text-3xl font-semibold tracking-tight">Laskenta</CardTitle>
            <CardDescription className="text-sm sm:text-base mt-1 sm:mt-2">
              Tarjouslaskenta ja hinnoittelujärjestelmä
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="px-4 sm:px-6">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Sähköpostiosoite
              </Label>
              <div className="relative">
                <Envelope className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="nimi@yritys.fi"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 sm:pl-10 h-11 sm:h-12 text-base"
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Salasana
              </Label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 sm:pl-10 h-11 sm:h-12 text-base"
                  disabled={isLoading}
                  autoComplete="current-password"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-11 sm:h-12 text-base font-medium shadow-md hover:shadow-lg transition-all"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                  Kirjaudutaan...
                </>
              ) : (
                <>
                  <SignIn className="w-5 h-5 mr-2" weight="bold" />
                  Kirjaudu sisään
                </>
              )}
            </Button>
          </form>

          <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-border">
            <p className="text-xs text-center text-muted-foreground">
              Käyttääksesi sovellusta tarvitset valtuutetun käyttäjätilin
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
