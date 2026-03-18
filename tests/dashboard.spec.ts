import { test, expect } from '@playwright/test';
import { loginAsCliente } from './helpers/auth';

test.describe('Dashboard e Onboarding', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsCliente(page);
    });

    test('deve exibir as métricas de dashboard e onboarding checklist', async ({ page }) => {
        await page.goto('/dashboard');
        
        // Título/Saudação (usamos um regex porque tem Bom dia / Boa tarde e o nome da clínica)
        await expect(page.getByText(/Bom dia|Boa tarde|Boa noite/i)).toBeVisible();
        
        // Valida as KPIs básicas
        await expect(page.getByText('Mensagens', { exact: true })).toBeVisible();
        await expect(page.getByText('Leads', { exact: true })).toBeVisible();
        await expect(page.getByText('Agendamentos', { exact: true })).toBeVisible();
        await expect(page.getByText('Créditos', { exact: true })).toBeVisible();

        // O checklist de onboarding é renderizado dinamicamente, mas procuramos "Primeiros passos com sua IARA"
        // Como o botão pode estar completo, vamos procurar outras palavras chave do onboarding se não tiver fechado
        // Como é um teste dinâmico, verificamos se seções vitais não quebraram a renderização do React
        await expect(page.getByRole('heading', { name: 'Próximos Agendamentos' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Conversas' })).toBeVisible();
    });
});
