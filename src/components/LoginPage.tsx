import { SignIn, GithubLogo } from '@phosphor-icons/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

export default function LoginPage() {
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
          <div className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-4 border border-border/50">
              <div className="flex items-start gap-3">
                <GithubLogo className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" weight="fill" />
                <div className="space-y-2">
                  <h3 className="font-medium text-sm">GitHub-tunnistautuminen</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Tämä sovellus käyttää Spark-pohjaista tunnistautumista. 
                    Kirjaudu sisään GitHub-tilillä, jonka omistaa tämän sovelluksen ylläpitäjä.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">Käyttöoikeudet</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <span><strong className="text-foreground">Omistaja:</strong> Täydet oikeudet kaikkiin toimintoihin</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                  <span><strong className="text-foreground">Muokkaaja:</strong> Voi luoda ja muokata dataa</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-1.5 flex-shrink-0" />
                  <span><strong className="text-foreground">Lukija:</strong> Voi tarkastella tietoja</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-border">
              <p className="text-xs text-center text-muted-foreground">
                Tarvitset valtuutetun GitHub-käyttäjätilin sovelluksen käyttöön
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
