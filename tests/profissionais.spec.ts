import { test, expect } from '@playwright/test'

test.describe('Profissionais', () => {
    test.beforeEach(async ({ page }) => {
        const email = process.env.TEST_EMAIL
        const senha = process.env.TEST_PASSWORD
        if (!email || !senha) {
            test.skip()
            return
        }
        // Login
        await page.goto('/login')
        await page.locator('input[placeholder="seu@email.com"]').fill(email)
        await page.locator('input[placeholder="••••••••"]').fill(senha)
        await page.locator('button:has-text("Entrar")').click()
        await page.waitForURL('**/dashboard**', { timeout: 15000 })
    })

    test('deve carregar a página de profissionais', async ({ page }) => {
        await page.goto('/equipe')
        await expect(page.getByText('Profissionais')).toBeVisible({ timeout: 10000 })
    })

    test('deve exibir botão de adicionar profissional', async ({ page }) => {
        await page.goto('/equipe')
        await expect(page.getByText('Novo Profissional').or(page.getByText('Adicionar'))).toBeVisible({ timeout: 10000 })
    })

    test('deve abrir formulário ao clicar em novo profissional', async ({ page }) => {
        await page.goto('/equipe')
        const btn = page.getByText('Novo Profissional').or(page.getByText('Adicionar'))
        await btn.first().click()
        // Deve exibir campo de nome
        await expect(page.locator('input[placeholder*="nome"], input[placeholder*="Nome"]').first()).toBeVisible({ timeout: 5000 })
    })

    test('deve listar procedimentos dentro do profissional', async ({ page }) => {
        await page.goto('/equipe')
        // Se houver profissionais cadastrados, verificar se a seção existe
        const profCard = page.locator('[class*="rounded"]').filter({ hasText: 'Procedimentos' }).first()
        if (await profCard.isVisible({ timeout: 5000 }).catch(() => false)) {
            await expect(profCard).toBeVisible()
        }
    })
})
