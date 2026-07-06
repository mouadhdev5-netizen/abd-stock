import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MessageSquare, Link, MessageCircle, FileText, History } from 'lucide-react'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConnectSection } from '../components/ConnectSection'
import { MessageComposer } from '../components/MessageComposer'
import { TemplateManager } from '../components/TemplateManager'
import { MessageHistory } from '../components/MessageHistory'

export default function WhatsAppPage() {
  const { t } = useTranslation(['production', 'common'])
  const [activeTab, setActiveTab] = useState('connect')

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-6rem)]">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-green-700 dark:text-green-500 flex items-center gap-2">
            <MessageCircle className="h-8 w-8" />
            {t('production:whatsapp.title', { defaultValue: 'WhatsApp Integration' })}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('production:whatsapp.subtitle', { defaultValue: 'Connect to WhatsApp and manage bulk messaging.' })}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
          <TabsList className="grid w-full grid-cols-4 max-w-2xl flex-shrink-0">
            <TabsTrigger value="connect" className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              {t('production:whatsapp.tabs.connect', { defaultValue: 'Connect' })}
            </TabsTrigger>
            <TabsTrigger value="compose" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              {t('production:whatsapp.tabs.compose', { defaultValue: 'Compose' })}
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {t('production:whatsapp.tabs.templates', { defaultValue: 'Templates' })}
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              {t('production:whatsapp.tabs.history', { defaultValue: 'History' })}
            </TabsTrigger>
          </TabsList>
          
          <div className="flex-1 overflow-auto mt-4 rounded-md border bg-card/50">
            <TabsContent value="connect" className="m-0 h-full p-6">
              <ConnectSection />
            </TabsContent>
            
            <TabsContent value="compose" className="m-0 h-full p-6">
              <MessageComposer />
            </TabsContent>
            
            <TabsContent value="templates" className="m-0 h-full p-6">
              <TemplateManager />
            </TabsContent>

            <TabsContent value="history" className="m-0 h-full p-6">
              <MessageHistory />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}
