'use client'

import { useState, useEffect } from 'react'
import { CategoryHierarchical } from '@/lib/types'
import { getCategoriesTree } from '@/lib/services/categorizer'
import {
    createCategory,
    updateCategory,
    deleteCategory
} from '@/lib/services/category-management'
import { CategoryTree } from '@/components/categories/category-tree'
import { CategoryFormModal } from '@/components/categories/category-form-modal'
import { KeywordsModal } from '@/components/categories/keywords-modal'
import { Plus, Settings, Info, RefreshCw, Calendar as CalendarIcon, CheckCircle, AlertCircle } from 'lucide-react'

export default function CategoriesSettingsPage() {
    const [categories, setCategories] = useState<CategoryHierarchical[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [modalMode, setModalMode] = useState<'create' | 'edit' | 'create-child'>('create')
    const [selectedCategory, setSelectedCategory] = useState<CategoryHierarchical | null>(null)
    const [selectedParentId, setSelectedParentId] = useState<string | undefined>(undefined)
    const [keywordsModalOpen, setKeywordsModalOpen] = useState(false)
    const [keywordsModalCategory, setKeywordsModalCategory] = useState<{
        id: string
        name: string
        color: string
    } | null>(null)

    // Estado para recategorización mensual
    const now = new Date()
    const [recategorizationMonth, setRecategorizationMonth] = useState(now.getMonth() + 1)
    const [recategorizationYear, setRecategorizationYear] = useState(now.getFullYear())
    const [isRecategorizing, setIsRecategorizing] = useState(false)
    const [monthlyRecategorizationResult, setMonthlyRecategorizationResult] = useState<{
        total_analyzed: number
        updated: number
        unchanged: number
        errors: number
        details: Array<{
            task_name: string
            old_category: string | null
            new_category: string
            keyword_matched: string
        }>
    } | null>(null)

    useEffect(() => {
        loadCategories()
    }, [])

    const loadCategories = async () => {
        setIsLoading(true)
        try {
            const data = await getCategoriesTree()
            setCategories(data)
        } catch (error) {
            console.error('Error loading categories:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleCreateCategory = () => {
        setModalMode('create')
        setSelectedCategory(null)
        setSelectedParentId(undefined)
        setModalOpen(true)
    }

    const handleEditCategory = (category: CategoryHierarchical) => {
        setModalMode('edit')
        setSelectedCategory(category)
        setModalOpen(true)
    }

    const handleAddChild = (parentId: string) => {
        setModalMode('create-child')
        setSelectedCategory(null)
        setSelectedParentId(parentId)
        setModalOpen(true)
    }

    const handleManageKeywords = (categoryId: string) => {
        const allCategories = [...categories]
        categories.forEach(parent => {
            if (parent.children) {
                allCategories.push(...parent.children)
            }
        })
        
        const category = allCategories.find(c => c.id === categoryId)
        if (category) {
            setKeywordsModalCategory({
                id: category.id,
                name: category.name,
                color: category.color
            })
            setKeywordsModalOpen(true)
        }
    }

    const handleSaveCategory = async (categoryData: any) => {
        try {
            if (categoryData.id) {
                // Update existing category
                await updateCategory(categoryData.id, {
                    name: categoryData.name,
                    description: categoryData.description,
                    color: categoryData.color,
                    emoji: categoryData.emoji,
                    parent_id: categoryData.parent_id
                })
            } else {
                // Create new category
                await createCategory({
                    name: categoryData.name,
                    description: categoryData.description,
                    color: categoryData.color,
                    emoji: categoryData.emoji,
                    parent_id: categoryData.parent_id
                })
            }
            await loadCategories()
        } catch (error) {
            throw error
        }
    }

    const handleDeleteCategory = async (categoryId: string) => {
        try {
            await deleteCategory(categoryId)
            await loadCategories()
        } catch (error: any) {
            alert(error.message || 'Error al eliminar la categoría')
        }
    }

    const handleMonthlyRecategorization = async () => {
        const confirmed = window.confirm(
            `¿Recategorizar todas las tareas de ${recategorizationMonth
                .toString()
                .padStart(2, '0')}/${recategorizationYear} usando las keywords actuales?\n\n` +
            'Esto puede cambiar categorías de tareas que ya estaban clasificadas.'
        )
        if (!confirmed) return

        setIsRecategorizing(true)
        try {
            const response = await fetch('/api/categorization/recategorize-month', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    year: recategorizationYear,
                    month: recategorizationMonth
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Error en la recategorización mensual')
            }

            setMonthlyRecategorizationResult(data.result)
        } catch (error: any) {
            console.error('Error en recategorización mensual:', error)
            alert(
                `❌ Error en recategorización mensual:\n${
                    error.message || 'Error desconocido'
                }\n\nRevisa la consola para más detalles.`
            )
        } finally {
            setIsRecategorizing(false)
        }
    }

    const flatCategories = categories.flatMap(parent => [
        parent,
        ...(parent.children || [])
    ])

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b">
                <div className="max-w-7xl mx-auto px-6 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <Settings className="w-8 h-8 text-blue-600" />
                                <h1 className="text-3xl font-bold">Gestión de Categorías</h1>
                            </div>
                            <p className="text-gray-600">
                                Configura categorías jerárquicas y sus keywords para la clasificación automática de tareas
                            </p>
                        </div>
                        <button
                            onClick={handleCreateCategory}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
                        >
                            <Plus className="w-5 h-5" />
                            Nueva Categoría Padre
                        </button>
                    </div>
                </div>
            </div>

            {/* Info Banner + Recategorización mensual */}
            <div className="max-w-7xl mx-auto px-6 py-4 space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-900">
                        <p className="font-medium mb-1">Cómo funciona el sistema de categorización:</p>
                        <ul className="space-y-1 list-disc list-inside">
                            <li>Las <strong>categorías padre</strong> organizan el trabajo en grandes áreas (Gestión, Creatividad, etc.)</li>
                            <li>Las <strong>subcategorías</strong> son las que realmente se asignan a las tareas</li>
                            <li>Cada subcategoría tiene <strong>keywords</strong> que se buscan en los nombres de las tareas</li>
                            <li>Las keywords con mayor <strong>prioridad</strong> se comprueban primero</li>
                            <li>Si no coincide ninguna keyword, la tarea se marca como <strong>"Sin Clasificar"</strong></li>
                        </ul>
                    </div>
                </div>

                <div className="bg-white border border-blue-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                            <CalendarIcon className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="text-sm text-gray-800">
                            <p className="font-medium mb-1">Recategorización por mes</p>
                            <p className="text-gray-600">
                                Después de ajustar categorías o keywords, puedes volver a aplicar el categorizador
                                sobre todas las tareas de un mes concreto para corregir clasificaciones antiguas.
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <div className="flex gap-2">
                            <select
                                value={recategorizationMonth}
                                onChange={(e) => setRecategorizationMonth(Number(e.target.value))}
                                className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white"
                            >
                                <option value={1}>Enero</option>
                                <option value={2}>Febrero</option>
                                <option value={3}>Marzo</option>
                                <option value={4}>Abril</option>
                                <option value={5}>Mayo</option>
                                <option value={6}>Junio</option>
                                <option value={7}>Julio</option>
                                <option value={8}>Agosto</option>
                                <option value={9}>Septiembre</option>
                                <option value={10}>Octubre</option>
                                <option value={11}>Noviembre</option>
                                <option value={12}>Diciembre</option>
                            </select>
                            <select
                                value={recategorizationYear}
                                onChange={(e) => setRecategorizationYear(Number(e.target.value))}
                                className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white"
                            >
                                {Array.from({ length: 5 }).map((_, index) => {
                                    const year = now.getFullYear() - 2 + index
                                    return (
                                        <option key={year} value={year}>
                                            {year}
                                        </option>
                                    )
                                })}
                            </select>
                        </div>
                        <button
                            onClick={handleMonthlyRecategorization}
                            disabled={isRecategorizing}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <RefreshCw
                                className={`w-4 h-4 ${isRecategorizing ? 'animate-spin' : ''}`}
                            />
                            {isRecategorizing ? 'Recategorizando...' : 'Recategorizar mes'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-6 py-6">
                {isLoading ? (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        <p className="mt-4 text-gray-600">Cargando categorías...</p>
                    </div>
                ) : (
                    <CategoryTree
                        categories={flatCategories}
                        onEditCategory={handleEditCategory}
                        onDeleteCategory={handleDeleteCategory}
                        onAddChild={handleAddChild}
                        onManageKeywords={handleManageKeywords}
                    />
                )}
            </div>

            {/* Modals */}
            <CategoryFormModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={handleSaveCategory}
                category={selectedCategory}
                parentCategories={categories}
                mode={modalMode}
                parentId={selectedParentId}
            />

            {keywordsModalCategory && (
                <KeywordsModal
                    isOpen={keywordsModalOpen}
                    onClose={() => setKeywordsModalOpen(false)}
                    categoryId={keywordsModalCategory.id}
                    categoryName={keywordsModalCategory.name}
                    categoryColor={keywordsModalCategory.color}
                />
            )}

            {/* Monthly recategorization results modal */}
            {monthlyRecategorizationResult && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col shadow-xl">
                        <div className="p-6 border-b flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold">
                                    Resultados recategorización {recategorizationMonth.toString().padStart(2, '0')}/
                                    {recategorizationYear}
                                </h2>
                                <p className="text-sm text-gray-600 mt-1">
                                    Tareas analizadas: {monthlyRecategorizationResult.total_analyzed} ·
                                    {' '}Actualizadas: {monthlyRecategorizationResult.updated} ·
                                    {' '}Sin cambios: {monthlyRecategorizationResult.unchanged}
                                    {monthlyRecategorizationResult.errors > 0 && (
                                        <>
                                            {' '}· Errores: {monthlyRecategorizationResult.errors}
                                        </>
                                    )}
                                </p>
                            </div>
                            <button
                                onClick={() => setMonthlyRecategorizationResult(null)}
                                className="text-sm text-gray-500 hover:text-gray-700"
                            >
                                Cerrar
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            {monthlyRecategorizationResult.updated === 0 ? (
                                <div className="text-center py-8">
                                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                    <p className="text-gray-700 font-medium">
                                        No se han encontrado cambios de categoría para ese mes.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {monthlyRecategorizationResult.details.map((detail, index) => (
                                        <div
                                            key={index}
                                            className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-start gap-3"
                                        >
                                            <CheckCircle className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm truncate" title={detail.task_name}>
                                                    {detail.task_name}
                                                </div>
                                                <div className="text-xs text-gray-600 mt-1 flex flex-wrap items-center gap-1">
                                                    <span className="truncate max-w-[40%]">
                                                        {detail.old_category || 'Sin categoría'}
                                                    </span>
                                                    <span className="mx-1">→</span>
                                                    <span className="font-semibold truncate max-w-[40%]">
                                                        {detail.new_category}
                                                    </span>
                                                    {detail.keyword_matched && (
                                                        <span className="ml-auto px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                                                            keyword: "{detail.keyword_matched}"
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t bg-gray-50">
                            <button
                                onClick={() => setMonthlyRecategorizationResult(null)}
                                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
