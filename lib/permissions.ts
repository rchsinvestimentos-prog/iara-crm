// ============================================
// Permissões por Role — Admin IARA
// ============================================

export type AdminRole = 'super_admin' | 'financeiro' | 'suporte' | 'desenvolvimento' | 'visualizador'

export interface AdminPermissions {
    label: string
    pages: string[]     // Páginas permitidas no admin
    canCreate: boolean  // Pode criar clínicas/usuários
    canEdit: boolean    // Pode editar clínicas
    canDelete: boolean  // Pode deletar/desativar
}

export const ROLE_LABELS: Record<AdminRole, string> = {
    super_admin: 'Super Admin',
    financeiro: 'Financeiro',
    suporte: 'Suporte',
    desenvolvimento: 'Desenvolvimento',
    visualizador: 'Visualizador',
}

export const ROLE_COLORS: Record<AdminRole, string> = {
    super_admin: '#D99773',
    financeiro: '#06D6A0',
    suporte: '#8B5CF6',
    desenvolvimento: '#3B82F6',
    visualizador: '#6B7280',
}

const PERMISSIONS: Record<AdminRole, AdminPermissions> = {
    super_admin: {
        label: 'Super Admin',
        pages: ['dashboard', 'clinicas', 'diagnostico', 'conversas', 'logs', 'saude', 'financeiro', 'feedback', 'links', 'whatsapp-fake', 'config', 'cofre', 'equipe'],
        canCreate: true,
        canEdit: true,
        canDelete: true,
    },
    financeiro: {
        label: 'Financeiro',
        pages: ['dashboard', 'financeiro', 'clinicas'],
        canCreate: false,
        canEdit: false,
        canDelete: false,
    },
    suporte: {
        label: 'Suporte',
        pages: ['dashboard', 'clinicas', 'conversas', 'feedback', 'diagnostico'],
        canCreate: false,
        canEdit: true,
        canDelete: false,
    },
    desenvolvimento: {
        label: 'Desenvolvimento',
        pages: ['dashboard', 'clinicas', 'diagnostico', 'conversas', 'logs', 'saude', 'feedback', 'links', 'whatsapp-fake', 'config', 'cofre', 'equipe'],
        canCreate: true,
        canEdit: true,
        canDelete: false,
    },
    visualizador: {
        label: 'Visualizador',
        pages: ['dashboard'],
        canCreate: false,
        canEdit: false,
        canDelete: false,
    },
}

// Mapa de href → page key
const HREF_TO_PAGE: Record<string, string> = {
    '/admin': 'dashboard',
    '/admin/clinicas': 'clinicas',
    '/admin/diagnostico': 'diagnostico',
    '/admin/conversas': 'conversas',
    '/admin/logs': 'logs',
    '/admin/saude': 'saude',
    '/admin/financeiro': 'financeiro',
    '/admin/feedback': 'feedback',
    '/admin/links': 'links',
    '/admin/whatsapp-fake': 'whatsapp-fake',
    '/admin/config': 'config',
    '/admin/cofre': 'cofre',
    '/admin/equipe': 'equipe',
}

export function getPermissions(role: string): AdminPermissions {
    return PERMISSIONS[role as AdminRole] || PERMISSIONS.visualizador
}

export function canAccessPage(role: string, href: string): boolean {
    const perms = getPermissions(role)
    const pageKey = HREF_TO_PAGE[href]
    if (!pageKey) return false
    return perms.pages.includes(pageKey)
}

export function canAccessPath(role: string, pathname: string): boolean {
    const perms = getPermissions(role)
    // /admin → dashboard
    if (pathname === '/admin') return perms.pages.includes('dashboard')
    // /admin/clinicas/123 → clinicas
    const segment = pathname.replace('/admin/', '').split('/')[0]
    return perms.pages.includes(segment)
}

export function getAllRoles(): { value: AdminRole; label: string; color: string }[] {
    return (Object.keys(ROLE_LABELS) as AdminRole[]).map(r => ({
        value: r,
        label: ROLE_LABELS[r],
        color: ROLE_COLORS[r],
    }))
}
