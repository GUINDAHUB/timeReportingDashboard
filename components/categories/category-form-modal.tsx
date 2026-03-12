'use client'

import { CategoryHierarchical } from '@/lib/types'
import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

interface CategoryFormModalProps {
    isOpen: boolean
    onClose: () => void
    onSave: (category: {
        id?: string
        name: string
        description: string
        color: string
        emoji: string
        parent_id?: string | null
        sort_order?: number
        match_priority?: number
    }) => Promise<void>
    category?: CategoryHierarchical | null
    parentCategories: CategoryHierarchical[]
    mode: 'create' | 'edit' | 'create-child'
    parentId?: string
}

const PRESET_COLORS = [
    { name: 'Verde', value: '#10b981' },
    { name: 'Amarillo', value: '#f59e0b' },
    { name: 'Naranja', value: '#f97316' },
    { name: 'Rojo', value: '#ef4444' },
    { name: 'Azul', value: '#3b82f6' },
    { name: 'Púrpura', value: '#8b5cf6' },
    { name: 'Rosa', value: '#ec4899' },
    { name: 'Gris', value: '#6b7280' },
]

const PRESET_EMOJIS = [
    '📁', '🟢', '🟡', '🟠', '🔴', '🔵', '🟣', '🟤',
    '📊', '💡', '🎯', '🎬', '✂️', '🎨', '💬', '📱',
    '🚀', '🤝', '📋', '📅', '📝', '📦', '🔄', '✍️',
    '❓', '⭐', '🔥', '💪', '🎉', '✨', '🌟', '⚡'
]

export function CategoryFormModal({
    isOpen,
    onClose,
    onSave,
    category,
    parentCategories,
    mode,
    parentId
}: CategoryFormModalProps) {
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [color, setColor] = useState('#10b981')
    const [emoji, setEmoji] = useState('📁')
    const [selectedParentId, setSelectedParentId] = useState<string | null>(null)
    const [matchPriority, setMatchPriority] = useState<number>(0)
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        if (category) {
            setName(category.name)
            setDescription(category.description || '')
            setColor(category.color)
            setEmoji(category.emoji || '📁')
            setSelectedParentId(category.parent_id || null)
            setMatchPriority((category as any).match_priority ?? 0)
        } else if (mode === 'create-child' && parentId) {
            setName('')
            setDescription('')
            setColor('#10b981')
            setEmoji('📁')
            setSelectedParentId(parentId)
            setMatchPriority(0)
        } else {
            setName('')
            setDescription('')
            setColor('#10b981')
            setEmoji('📁')
            setSelectedParentId(null)
            setMatchPriority(0)
        }
    }, [category, mode, parentId])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            await onSave({
                ...(category?.id && { id: category.id }),
                name,
                description,
                color,
                emoji,
                parent_id: selectedParentId,
                sort_order: category?.sort_order,
                match_priority: matchPriority
            })
            onClose()
        } catch (error) {
            console.error('Error saving category:', error)
            alert('Error al guardar la categoría')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!isOpen) return null

    const title = mode === 'edit'
        ? 'Editar Categoría'
        : mode === 'create-child'
        ? 'Nueva Subcategoría'
        : 'Nueva Categoría'

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold">{title}</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nombre *
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                            placeholder="Ej: Edición y Montaje"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Descripción
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            rows={3}
                            placeholder="Breve descripción de la categoría..."
                        />
                    </div>

                    {/* Parent Category */}
                    {mode !== 'create-child' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Categoría Padre (opcional)
                            </label>
                            <select
                                value={selectedParentId || ''}
                                onChange={(e) => setSelectedParentId(e.target.value || null)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">Sin padre (categoría raíz)</option>
                                {parentCategories.filter(c => !c.parent_id).map(parent => (
                                    <option key={parent.id} value={parent.id}>
                                        {parent.emoji} {parent.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Color */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Color *
                        </label>
                        <div className="grid grid-cols-8 gap-2 mb-3">
                            {PRESET_COLORS.map((presetColor) => (
                                <button
                                    key={presetColor.value}
                                    type="button"
                                    onClick={() => setColor(presetColor.value)}
                                    className={`w-full aspect-square rounded-lg border-2 transition-all ${
                                        color === presetColor.value
                                            ? 'border-gray-900 scale-110'
                                            : 'border-gray-200 hover:border-gray-400'
                                    }`}
                                    style={{ backgroundColor: presetColor.value }}
                                    title={presetColor.name}
                                />
                            ))}
                        </div>
                        <input
                            type="color"
                            value={color}
                            onChange={(e) => setColor(e.target.value)}
                            className="w-full h-10 rounded-lg border border-gray-300 cursor-pointer"
                        />
                    </div>

                    {/* Emoji */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Emoji *
                        </label>
                        <div className="grid grid-cols-12 gap-2 mb-3">
                            {PRESET_EMOJIS.map((presetEmoji) => (
                                <button
                                    key={presetEmoji}
                                    type="button"
                                    onClick={() => setEmoji(presetEmoji)}
                                    className={`aspect-square text-2xl rounded-lg border-2 transition-all ${
                                        emoji === presetEmoji
                                            ? 'border-gray-900 bg-gray-100 scale-110'
                                            : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                                    }`}
                                >
                                    {presetEmoji}
                                </button>
                            ))}
                        </div>
                        <input
                            type="text"
                            value={emoji}
                            onChange={(e) => setEmoji(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-2xl text-center"
                            maxLength={2}
                            placeholder="📁"
                        />
                    </div>

                    {/* Match priority */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Prioridad de auto-categorización
                        </label>
                        <p className="text-xs text-gray-500 mb-2">
                            Cuanto <span className="font-semibold">mayor</span> sea el número, más probabilidad de que
                            esta subcategoría gane cuando varias coinciden con la misma tarea. Solo se aplica a
                            <span className="font-semibold"> subcategorías</span>.
                        </p>
                        <input
                            type="number"
                            value={matchPriority}
                            onChange={(e) => setMatchPriority(parseInt(e.target.value || '0', 10))}
                            className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                    </div>

                    {/* Preview */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <p className="text-xs font-medium text-gray-500 mb-2">Vista previa:</p>
                        <div className="flex items-center gap-3">
                            <div
                                className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                                style={{ backgroundColor: color + '20' }}
                            >
                                {emoji}
                            </div>
                            <div>
                                <h3 className="font-semibold">{name || 'Nombre de la categoría'}</h3>
                                {description && (
                                    <p className="text-sm text-gray-500">{description}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
