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
import { Plus, Settings, Info } from 'lucide-react'

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

            {/* Info Banner */}
            <div className="max-w-7xl mx-auto px-6 py-4">
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
        </div>
    )
}
