import { test, expect } from '@playwright/test';
import { loginAsCliente } from './helpers/auth';

test.describe('Cofre (Secretária)', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsCliente(page);
    });

    test('deve acessar o cofre, trocar de abas e salvar as leis imutaveis', async ({ page }) => {
        // Acessar a página de cofre
        await page.goto('/cofre');
        await expect(page.getByRole('heading', { name: 'Personalizar IARA' })).toBeVisible();

        // Verificar abas
        await expect(page.getByText('Regras da IARA')).toBeVisible();
        await expect(page.getByText('Arsenal de Objeções')).toBeVisible();
        await expect(page.getByText('Roteiro de Vendas')).toBeVisible();

        // Escrever algo na aba atual (Leis)
        const textbox = page.locator('textarea');
        await expect(textbox).toBeVisible();
        
        // Clica no text box e escreve text
        await textbox.fill('Teste de leis imutáveis gerado pelo Playwright - ' + Date.now());

        // Clicar em Salvar
        const btnSalvar = page.getByRole('button', { name: /Salvar Alterações/i });
        await btnSalvar.click();

        // Verificar botão mudando para Salvo
        await expect(page.getByRole('button', { name: /Salvo!/i })).toBeVisible();
    });
});
