import React from 'react'
import ReactDOM from 'react-dom/client'
import { queryClient } from '@/lib/queryClient'
import App from './App.tsx'
import './index.css'
import '@/i18n'

import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'

// Create a persister using localStorage
const localStoragePersister = createSyncStoragePersister({
  storage: window.localStorage,
})

// Initialize app
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: localStoragePersister }}
    >
      <App />
    </PersistQueryClientProvider>
  </React.StrictMode>,
)
