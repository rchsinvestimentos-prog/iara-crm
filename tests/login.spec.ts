import { test, expect } from '@playwright/test'

test.describe('Login', () => {
    test('deve exibir a página de login', async ({ page }) => {
        await page.goto('/login')
        await expect(page.locator('input[placeholder="seu@email.com"]')).toBeVisible()
        await expect(page.locator('input[placeholder="••••••••"]')).toBeVisible()
    })

    test('deve mostrar erro com senha errada', async ({ page }) => {
        await page.goto('/login')
        
        await page.locator('input[placeholder="seu@email.com"]').fill('teste@invalido.com')
        await page.locator('input[placeholder="••••••••"]').fill('senhaerrada123')
        
        await page.locator('button:has-text("Entrar")').click()
        
        // Mensagem real do app: "E-mail ou senha incorretos"
        await expect(page.getByText('E-mail ou senha incorretos')).toBeVisible({ timeout: 10000 })
    })

    test('deve fazer login com credenciais válidas', async ({ page }) => {
        const email = process.env.TEST_EMAIL
        const senha = process.env.TEST_PASSWORD
        if (!email || !senha) {
            test.skip()
            return
        }

        await page.goto('/login')
        
        await page.locator('input[placeholder="seu@email.com"]').fill(email)
        await page.locator('input[placeholder="••••••••"]').fill(senha)
        
        await page.locator('button:has-text("Entrar")').click()
        
        await page.waitForURL('**/dashboard**', { timeout: 15000 })
        await expect(page).toHaveURL(/dashboard/)
    })
})
