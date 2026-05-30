import { test, expect } from '@playwright/test';
import { loginAsCliente } from './helpers/auth';

test.describe('Cofre (Secretária)', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsCliente(page);
    });

    test('deve acessar o cofre e verificar abas sem alterar dados', async ({ page }) => {
        // Acessar a página de cofre
        await page.goto('/cofre');
        await expect(page.getByRole('heading', { name: 'Personalizar IARA' })).toBeVisible();

        // Verificar abas — usar getByRole('button') para evitar ambiguidade com o heading h3
        await expect(page.getByRole('button', { name: /Regras da IARA/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /Arsenal de Objeções/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /Roteiro de Vendas/i })).toBeVisible();

        // Verificar que o editor/textarea está presente
        const textbox = page.locator('textarea');
        await expect(textbox).toBeVisible();

        // Verificar que o conteúdo NÃO está vazio (regras devem existir)
        const conteudo = await textbox.inputValue();
        expect(conteudo.length).toBeGreaterThan(0);

        // Navegar entre abas sem alterar dados
        await page.getByRole('button', { name: /Arsenal de Objeções/i }).click();
        await expect(textbox).toBeVisible();

        await page.getByRole('button', { name: /Roteiro de Vendas/i }).click();
        await expect(textbox).toBeVisible();

        // Voltar para Regras
        await page.getByRole('button', { name: /Regras da IARA/i }).click();
        await expect(textbox).toBeVisible();

        // Verificar que botão Salvar existe
        await expect(page.getByRole('button', { name: /Salvar Alterações/i })).toBeVisible();
    });
});
