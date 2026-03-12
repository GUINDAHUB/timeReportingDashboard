'use client'

import { Keyword } from '@/lib/types'
import { useState, useEffect } from 'react'
import { X, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react'
import { getKeywordsByCategory, createKeyword, updateKeyword, deleteKeyword } from '@/lib/services/category-management'

interface KeywordsModalProps {
    isOpen: boolean
    onClose: () => void
    categoryId: string
    categoryName: string
    categoryColor: string
}

export function KeywordsModal({
    isOpen,
    onClose,
    categoryId,
    categoryName,
    categoryColor
}: KeywordsModalProps) {
    const [keywords, setKeywords] = useState<Keyword[]>([])
    const [newKeyword, setNewKeyword] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        if (isOpen) {
            loadKeywords()
        }
    }, [isOpen, categoryId])

    const loadKeywords = async () => {
        setIsLoading(true)
        try {
            const data = await getKeywordsByCategory(categoryId)
            setKeywords(data)
        } catch (error) {
            console.error('Error loading keywords:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleAddKeyword = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newKeyword.trim()) return

        setIsSubmitting(true)
        try {
            const created = await createKeyword({
                category_id: categoryId,
                word: newKeyword.trim()
            })
            setKeywords([created, ...keywords])
            setNewKeyword('')
        } catch (error: any) {
            alert(error.message || 'Error al crear keyword')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDeleteKeyword = async (keywordId: string) => {
        if (!confirm('¿Seguro que quieres eliminar esta keyword?')) return

        try {
            await deleteKeyword(keywordId)
            setKeywords(keywords.filter(k => k.id !== keywordId))
        } catch (error) {
            alert('Error al eliminar keyword')
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold">Gestionar Keywords</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            <span
                                className="inline-block w-3 h-3 rounded-full mr-2"
                                style={{ backgroundColor: categoryColor }}
                            />
                            {categoryName}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {/* Add keyword form */}
                    <form onSubmit={handleAddKeyword} className="mb-6 p-4 bg-blue-50 rounded-lg">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Añadir Nueva Keyword
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newKeyword}
                                onChange={(e) => setNewKeyword(e.target.value)}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Ej: rodaje, sesión, grabación..."
                                disabled={isSubmitting}
                            />
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                                disabled={isSubmitting || !newKeyword.trim()}
                            >
                                <Plus className="w-4 h-4" />
                                Añadir
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            💡 Todas las keywords de esta subcategoría comparten la misma prioridad, que ahora se define
                            a nivel de categoría (campo "Prioridad de auto-categorización").
                        </p>
                    </form>

                    {/* Keywords list */}
                    {isLoading ? (
                        <div className="text-center py-8 text-gray-500">
                            Cargando keywords...
                        </div>
                    ) : keywords.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            No hay keywords configuradas para esta categoría.
                            <br />
                            Añade la primera keyword arriba.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs font-medium text-gray-500 px-3 pb-2">
                                <span>KEYWORD</span>
                            </div>
                            {keywords.map((keyword) => (
                                <div
                                    key={keyword.id}
                                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                                >
                                    <span className="font-mono text-sm">{keyword.word}</span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleDeleteKeyword(keyword.id)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Eliminar"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-gray-50 px-6 py-4 border-t flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                        Total: <span className="font-semibold">{keywords.length}</span> keywords
                    </p>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-gray-900 text-white hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    )
}
