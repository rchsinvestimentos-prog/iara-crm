import { test, expect } from '@playwright/test'
import { loginAsCliente } from './helpers/auth'

test.describe('Configurações da Clínica', () => {
    test.beforeEach(async ({ page }) => {
        const email = process.env.TEST_EMAIL
        const senha = process.env.TEST_PASSWORD
        if (!email || !senha) {
            test.skip()
            return
        }
        await loginAsCliente(page)
    })

    test('deve carregar a página de configurações', async ({ page }) => {
        await page.goto('/configuracoes')
        await page.waitForLoadState('networkidle')
        
        // Deve mostrar algum conteúdo de configuração
        await expect(page.locator('text=Configurações, text=Clínica, text=Procedimentos').first()).toBeVisible({ timeout: 10000 })
    })

    test('deve conseguir salvar nome da clínica', async ({ page }) => {
        await page.goto('/configuracoes')
        await page.waitForLoadState('networkidle')
        
        // Procura input de nome da clínica
        const nomeInput = page.locator('input[placeholder*="clínica" i], input[placeholder*="clinica" i]').first()
        if (await nomeInput.isVisible()) {
            const valorOriginal = await nomeInput.inputValue()
            
            // Altera e salva
            await nomeInput.fill('Clínica Teste E2E')
            
            // Clica em algum botão de salvar 
            const salvarBtn = page.locator('button:has-text("Salvar")').first()
            await salvarBtn.click()
            
            // Deve mostrar confirmação
            await expect(page.locator('text=Salvo, text=sucesso, text=✅').first()).toBeVisible({ timeout: 10000 })
            
            // Restaura valor original
            if (valorOriginal) {
                await nomeInput.fill(valorOriginal)
                await salvarBtn.click()
                await page.waitForTimeout(2000)
            }
        }
    })
})
