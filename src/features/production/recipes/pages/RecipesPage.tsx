// @ts-nocheck
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Plus, Search, Play, Pencil, Clock, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatCurrency } from '@/lib/utils'
import { RecipeForm } from '../components/RecipeForm'
import { RecipeExecuteDialog } from '../components/RecipeExecuteDialog'
import { RecipeHistoryPanel } from '../components/RecipeHistoryPanel'

export default function RecipesPage() {
  const { t } = useTranslation(['production', 'common'])
  const { company } = useAuthStore()

  const [searchTerm, setSearchTerm] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<any>(null)
  
  const [isExecuteOpen, setIsExecuteOpen] = useState(false)
  const [executingRecipe, setExecutingRecipe] = useState<any>(null)
  
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [historyRecipeId, setHistoryRecipeId] = useState<string | null>(null)
  const [historyRecipeName, setHistoryRecipeName] = useState('')

  const { data: recipes, isLoading, refetch } = useQuery({
    queryKey: ['recipes', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const { data, error } = await supabase
        .from('recipes')
        .select(`
          *,
          recipe_items(id, quantity_used, component:components(id, name, unit, quantity_in_stock)),
          recipe_outputs(id, quantity_produced, product:products(id, name), variant:product_variants(id, name)),
          recipe_charges(id, description, amount)
        `)
        .eq('company_id', company.id)
        .order('name')
      if (error) throw error
      return data
    },
    enabled: !!company?.id,
  })

  const filteredRecipes = recipes?.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.name_ar && r.name_ar.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (r.name_fr && r.name_fr.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || []

  const handleEdit = (recipe: any) => {
    setEditingRecipe(recipe)
    setIsFormOpen(true)
  }

  const handleExecute = (recipe: any) => {
    setExecutingRecipe(recipe)
    setIsExecuteOpen(true)
  }

  const handleHistory = (recipe: any) => {
    setHistoryRecipeId(recipe.id)
    setHistoryRecipeName(recipe.name)
    setIsHistoryOpen(true)
  }

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-6rem)]">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-purple-700 dark:text-purple-400">
            {t('production:recipes.title', { defaultValue: 'Recipes' })}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('production:recipes.subtitle', { defaultValue: 'Manage production formulas and execute workflows.' })}
          </p>
        </div>
        <Button onClick={() => { setEditingRecipe(null); setIsFormOpen(true) }} className="bg-purple-600 hover:bg-purple-700 text-white">
          <Plus className="me-2 h-4 w-4" />
          {t('production:recipes.add', { defaultValue: 'Add Recipe' })}
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center justify-between gap-3 flex-shrink-0">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t('production:recipes.search_placeholder', { defaultValue: 'Search recipes...' })}
            className="ps-8 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-md bg-card flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead>{t('production:recipes.name', { defaultValue: 'Recipe Name' })}</TableHead>
                <TableHead>{t('production:recipes.components_count', { defaultValue: 'Components Used' })}</TableHead>
                <TableHead>{t('production:recipes.outputs_count', { defaultValue: 'Products Produced' })}</TableHead>
                <TableHead className="text-end">{t('production:recipes.total_charges', { defaultValue: 'Total Charges' })}</TableHead>
                <TableHead className="text-end">{t('actions.actions', { ns: 'common', defaultValue: 'Actions' })}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filteredRecipes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    {t('labels.no_data', { ns: 'common', defaultValue: 'No recipes found.' })}
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecipes.map((recipe: any) => {
                  const chargesTotal = recipe.recipe_charges?.reduce((acc: number, c: any) => acc + Number(c.amount), 0) || 0

                  return (
                    <TableRow key={recipe.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">
                        <div>{recipe.name}</div>
                        {(recipe.name_ar || recipe.name_fr) && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {recipe.name_ar && <span>{recipe.name_ar}</span>}
                            {recipe.name_ar && recipe.name_fr && <span className="mx-1">•</span>}
                            {recipe.name_fr && <span>{recipe.name_fr}</span>}
                          </div>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger className="underline decoration-dotted cursor-help">
                              {recipe.recipe_items?.length || 0} {t('production:components.title', { defaultValue: 'Components' })}
                            </TooltipTrigger>
                            <TooltipContent>
                              <ul className="text-xs space-y-1">
                                {recipe.recipe_items?.map((item: any, i: number) => (
                                  <li key={i}>{item.component?.name} ({item.quantity_used} {item.component?.unit})</li>
                                ))}
                                {recipe.recipe_items?.length === 0 && <li>None</li>}
                              </ul>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>

                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger className="underline decoration-dotted cursor-help">
                              {recipe.recipe_outputs?.length || 0} {t('labels.products', { ns: 'common', defaultValue: 'Products' })}
                            </TooltipTrigger>
                            <TooltipContent>
                              <ul className="text-xs space-y-1">
                                {recipe.recipe_outputs?.map((out: any, i: number) => (
                                  <li key={i}>{out.product?.name} {out.variant?.name ? `(${out.variant.name})` : ''} (+{out.quantity_produced})</li>
                                ))}
                                {recipe.recipe_outputs?.length === 0 && <li>None</li>}
                              </ul>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>

                      <TableCell className="text-end text-muted-foreground font-medium">
                        {formatCurrency(chargesTotal, company?.currency || 'DZD')}
                      </TableCell>

                      <TableCell className="text-end">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                            onClick={() => handleExecute(recipe)}
                            title={t('production:recipes.execute_btn', { defaultValue: 'Execute' })}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => handleHistory(recipe)}
                            title={t('production:recipes.history', { defaultValue: 'History' })}
                          >
                            <Clock className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => handleEdit(recipe)}
                            title={t('actions.edit', { ns: 'common', defaultValue: 'Edit' })}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <RecipeForm
        initialData={editingRecipe}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={() => refetch()}
      />

      <RecipeExecuteDialog
        recipe={executingRecipe}
        isOpen={isExecuteOpen}
        onClose={() => setIsExecuteOpen(false)}
        onSuccess={() => refetch()}
      />

      <RecipeHistoryPanel
        recipeId={historyRecipeId}
        recipeName={historyRecipeName}
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />
    </div>
  )
}
