import { Navigate, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { useAuth } from './useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface LoginForm {
  email: string
  password: string
}

export function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<LoginForm & { apiError?: string }>({
    defaultValues: { email: '', password: '' },
  })

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const onSubmit = async (data: LoginForm) => {
    try {
      await login(data.email, data.password)
      navigate('/')
    } catch (err: unknown) {
      const apiError = err as { message?: string }
      setError('apiError', { message: apiError?.message ?? 'Une erreur inattendue s\'est produite' })
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Batério</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="votre@email.fr"
                autoComplete="email"
                {...register('email', {
                  required: "L'email est requis",
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "L'email n'est pas valide" },
                })}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register('password', { required: 'Le mot de passe est requis' })}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
            {errors.apiError && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {errors.apiError.message}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
