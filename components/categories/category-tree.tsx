'use client'

import { CategoryHierarchical, Keyword } from '@/lib/types'
import { useState } from 'react'
import { ChevronDown, ChevronRight, Edit, Trash2, Plus, Tag } from 'lucide-react'

interface CategoryTreeProps {
    categories: CategoryHierarchical[]
    onEditCategory: (category: CategoryHierarchical) => void
    onDeleteCategory: (categoryId: string) => void
    onAddChild: (parentId: string) => void
    onManageKeywords: (categoryId: string) => void
}

export function CategoryTree({
    categories,
    onEditCategory,
    onDeleteCategory,
    onAddChild,
    onManageKeywords
}: CategoryTreeProps) {
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

    const toggleExpand = (categoryId: string) => {
        const newExpanded = new Set(expandedCategories)
        if (newExpanded.has(categoryId)) {
            newExpanded.delete(categoryId)
        } else {
            newExpanded.add(categoryId)
        }
        setExpandedCategories(newExpanded)
    }

    const parentCategories = categories.filter(c => !c.parent_id)
    const getChildren = (parentId: string) => categories.filter(c => c.parent_id === parentId)

    const renderCategory = (category: CategoryHierarchical, level: number = 0) => {
        const children = getChildren(category.id)
        const hasChildren = children.length > 0
        const isExpanded = expandedCategories.has(category.id)
        const isParent = level === 0

        return (
            <div key={category.id} className="mb-1">
                <div
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                        isParent
                            ? 'bg-white border-gray-200 shadow-sm'
                            : 'bg-gray-50 border-gray-100 ml-8'
                    } hover:border-gray-300 transition-colors`}
                >
                    <div className="flex items-center gap-3 flex-1">
                        {/* Expand/collapse button */}
                        {hasChildren && (
                            <button
                                onClick={() => toggleExpand(category.id)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                {isExpanded ? (
                                    <ChevronDown className="w-5 h-5" />
                                ) : (
                                    <ChevronRight className="w-5 h-5" />
                                )}
                            </button>
                        )}
                        {!hasChildren && isParent && <div className="w-5" />}

                        {/* Category info */}
                        <div className="flex items-center gap-3 flex-1">
                            <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                                style={{ backgroundColor: category.color + '20' }}
                            >
                                {category.emoji || '📁'}
                            </div>
                            <div className="flex-1">
                                <h3 className={`font-semibold ${isParent ? 'text-base' : 'text-sm'}`}>
                                    {category.name}
                                </h3>
                                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                    {category.description && (
                                        <p className="text-xs text-gray-500">
                                            {category.description}
                                        </p>
                                    )}
                                    {!isParent && typeof (category as any).match_priority === 'number' && (
                                        <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 text-[10px] rounded-full border border-amber-100">
                                            Prio auto: {(category as any).match_priority}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Stats badges */}
                            <div className="flex items-center gap-2">
                                {category.keyword_count !== undefined && category.keyword_count > 0 && (
                                    <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full font-medium">
                                        {category.keyword_count} keywords
                                    </span>
                                )}
                                {category.child_count !== undefined && category.child_count > 0 && (
                                    <span className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded-full font-medium">
                                        {category.child_count} subcategorías
                                    </span>
                                )}
                                {category.is_default && (
                                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">
                                        Por defecto
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 ml-4">
                        {!isParent && (
                            <button
                                onClick={() => onManageKeywords(category.id)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Gestionar keywords"
                            >
                                <Tag className="w-4 h-4" />
                            </button>
                        )}
                        {isParent && (
                            <button
                                onClick={() => onAddChild(category.id)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Añadir subcategoría"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        )}
                        <button
                            onClick={() => onEditCategory(category)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Editar"
                        >
                            <Edit className="w-4 h-4" />
                        </button>
                        {!category.is_default && (
                            <button
                                onClick={() => {
                                    if (confirm(`¿Seguro que quieres eliminar "${category.name}"?`)) {
                                        onDeleteCategory(category.id)
                                    }
                                }}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Eliminar"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Children */}
                {hasChildren && isExpanded && (
                    <div className="mt-1">
                        {children.map(child => renderCategory(child, level + 1))}
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {parentCategories.map(category => renderCategory(category))}
        </div>
    )
}
