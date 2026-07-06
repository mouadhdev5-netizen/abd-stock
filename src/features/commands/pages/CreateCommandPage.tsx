import { useTranslation } from 'react-i18next'
import { CommandForm } from '../components/CommandForm'
import { Card, CardContent } from '@/components/ui/card'
import { ChevronRight, Home } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function CreateCommandPage() {
  const { t } = useTranslation(['commerce'])

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex items-center text-sm text-muted-foreground">
        <Link to="/" className="hover:text-primary transition-colors"><Home className="h-4 w-4" /></Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <Link to="/commerce/commands/en-cours" className="hover:text-primary transition-colors">Commands</Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <span className="text-foreground font-medium">Create Command</span>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Command</h1>
        <p className="text-muted-foreground mt-1">Create a new order and automatically dispatch it to Yalidin.</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <CommandForm onSuccess={() => window.location.href = '/commerce/commands/en-cours'} />
        </CardContent>
      </Card>
    </div>
  )
}
