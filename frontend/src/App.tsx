import { BrowserRouter, Routes, Route } from 'react-router'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'

function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">Batério</h1>
      <p className="text-muted-foreground">
        Application de gestion des travaux
      </p>
      <Button>Commencer</Button>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<HomePage />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  )
}
