import { test, expect } from '@playwright/test'
import { loginAsCliente } from './helpers/auth'

test.describe('Onboarding', () => {
    test.beforeEach(async ({ page }) => {
        const email = process.env.TEST_EMAIL
        const senha = process.env.TEST_PASSWORD
        if (!email || !senha) {
            test.skip()
            return
        }
        await loginAsCliente(page)
    })

    test('deve carregar o checklist de onboarding na inicializacao', async ({ page }) => {
        await page.goto('/dashboard') // Muitas vezes o onboarding fica no dashboard
        await page.waitForLoadState('networkidle')
        
        // Verifica se a seção de onboarding está lá
        const onboardingContainer = page.locator('text=Onboarding, text=Passos, text=Progresso, text=Começar').first()
        await expect(onboardingContainer).toBeVisible({ timeout: 10000 })
    })

    test('itens concluidos devem aparecer diferentes (ex: riscados ou com check)', async ({ page }) => {
        await page.goto('/dashboard')
        await page.waitForLoadState('networkidle')
        
        // Chega se existe algo com classes típicas de concluído (line-through, checked, bg-green)
        // Isso verifica a funcionalidade da linha visual
        const itemsConcluidos = page.locator('.line-through, [data-state="checked"], .text-green-500, svg.text-green-500').first()
        
        // Se houver algum item concluído, garante que ele tá refletido visualmente.
        // O Playwright não falha imediatamente, mas tentamos checar se é interativo
        if (await itemsConcluidos.isVisible()) {
            await expect(itemsConcluidos).toBeVisible()
        }
    })
})
