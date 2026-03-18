import { Page, expect } from '@playwright/test'

/**
 * Faz login no painel da IARA.
 * Usa credenciais do env ou fallback para teste.
 */
export async function loginAsCliente(page: Page) {
    const email = process.env.TEST_EMAIL || 'suportepscomvc@gmail.com'
    const senha = process.env.TEST_PASSWORD || 'Dpggs53cvL'

    await page.goto('/login')
    await page.waitForSelector('input[placeholder="seu@email.com"]', { timeout: 10000 })

    // Preencher email
    await page.locator('input[placeholder="seu@email.com"]').fill(email)

    // Preencher senha
    await page.locator('input[placeholder="••••••••"]').fill(senha)

    // Clicar no botão de login
    await page.locator('button:has-text("Entrar")').click()

    // Esperar redirecionar para o dashboard (usa window.location.href, não router)
    // Timeout aumentado para 30s porque o app pode demorar para carregar
    await page.waitForURL('**/dashboard**', { timeout: 30000 })
    await expect(page).toHaveURL(/dashboard/)
}
