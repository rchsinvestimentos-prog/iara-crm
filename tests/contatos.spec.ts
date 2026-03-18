import { test, expect } from '@playwright/test';
import { loginAsCliente } from './helpers/auth';

test.describe('Contatos', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsCliente(page);
    });

    test('deve carregar a lista de contatos e exibir modais', async ({ page }) => {
        await page.goto('/contatos');
        
        // Header
        await expect(page.getByRole('heading', { name: 'Contatos' })).toBeVisible();
        
        // Verifica se o botão "Novo contato" existe
        const btnNovo = page.getByRole('button', { name: /Novo contato/i });
        await expect(btnNovo).toBeVisible();

        // Clica para abrir modal
        await btnNovo.click();
        await expect(page.getByRole('heading', { name: 'Novo Contato' })).toBeVisible();

        // Digita um nome e telefone no modal
        await page.getByPlaceholder('Maria Silva').fill('Teste Contato Playwright');
        await page.getByPlaceholder('11999998888').fill('11988887777');
        
        // Fecha o modal
        const btnCancelar = page.getByRole('button', { name: 'Cancelar' });
        await btnCancelar.click();
        
        // Verifica barra de pesquisa
        const searchInput = page.getByPlaceholder(/Buscar por nome/i);
        await expect(searchInput).toBeVisible();
    });

    test('deve acessar o accordion de configurações de aniversario', async ({ page }) => {
        await page.goto('/contatos');
        
        // Automações de aniversário
        const anivHeader = page.getByRole('heading', { name: /Automações de Aniversário/i });
        await expect(anivHeader).toBeVisible();
        await anivHeader.click(); // Expandir ou fechar o accordion

        // Deve mostrar configurações extras se estiver aberto, como fluxo de mensagens
        await expect(page.getByText('Fluxo de Mensagens')).toBeVisible();
    });
});
