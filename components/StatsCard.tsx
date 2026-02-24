'use client'

import { ReactNode } from 'react'

interface StatsCardProps {
    title: string
    value: string | number
    icon: ReactNode
    change?: string
    changeType?: 'up' | 'down' | 'neutral'
    subtitle?: string
}

export default function StatsCard({ title, value, icon, change, changeType = 'neutral', subtitle }: StatsCardProps) {
    const changeColor = {
        up: 'text-green-600 bg-green-50',
        down: 'text-red-600 bg-red-50',
        neutral: 'text-acinzentado bg-gray-50',
    }

    return (
        <div className="glass-card p-6 flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <span className="text-sm text-acinzentado font-medium">{title}</span>
                <div className="w-10 h-10 rounded-xl bg-glacial flex items-center justify-center text-terracota">
                    {icon}
                </div>
            </div>

            <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-petroleo">{value}</span>
                {change && (
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${changeColor[changeType]}`}>
                        {change}
                    </span>
                )}
            </div>

            {subtitle && (
                <span className="text-xs text-acinzentado">{subtitle}</span>
            )}
        </div>
    )
}
