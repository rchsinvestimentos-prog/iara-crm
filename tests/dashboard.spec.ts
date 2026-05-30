import { test, expect } from '@playwright/test';
import { loginAsCliente } from './helpers/auth';

test.describe('Dashboard e Onboarding', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsCliente(page);
    });

    test('deve exibir a saudação e conteúdo principal do dashboard', async ({ page }) => {
        await page.goto('/dashboard');
        
        // Título/Saudação — espera o loading acabar (API pode demorar)
        await expect(page.getByText(/Bom dia|Boa tarde|Boa noite/i)).toBeVisible({ timeout: 15000 });

        // O dashboard pode mostrar onboarding OU KPIs dependendo do estado da conta
        // Verificamos qual cenário aparece e validamos de acordo
        const onboardingVisible = await page.getByText('Primeiros passos').isVisible({ timeout: 3000 }).catch(() => false);
        
        if (onboardingVisible) {
            // Cenário: conta nova com onboarding ativo
            await expect(page.getByText(/Primeiros passos/i)).toBeVisible();
            await expect(page.getByText(/Etapa 1/i)).toBeVisible();
        } else {
            // Cenário: conta com onboarding completo — KPIs visíveis
            await expect(page.getByText('Mensagens', { exact: true })).toBeVisible({ timeout: 10000 });
            await expect(page.getByText('Leads', { exact: true })).toBeVisible({ timeout: 5000 });
            await expect(page.getByText('Agendamentos', { exact: true })).toBeVisible({ timeout: 5000 });
        }
    });

    test('deve renderizar o dashboard sem erros de React', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', err => errors.push(err.message));

        await page.goto('/dashboard');
        await page.waitForTimeout(5000); // espera carregar completamente

        // Verifica que nenhum erro fatal de React aconteceu
        const fatalErrors = errors.filter(e => e.includes('Minified React error') || e.includes('unhandled'));
        expect(fatalErrors).toHaveLength(0);
    });
});
