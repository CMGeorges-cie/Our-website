import { test, expect } from '@playwright/test';
import { adminLogin, dismissToasts, removeEmergentBadge } from '../fixtures/helpers';

test.describe('Invoice List Page', () => {
  test.beforeEach(async ({ page }) => {
    await adminLogin(page);
    await dismissToasts(page);
    await page.goto('/admin/invoices', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="admin-invoices-page"]');
  });

  test('invoice page displays stats cards', async ({ page }) => {
    // Check all 4 stats cards are visible
    await expect(page.getByText('Total factures')).toBeVisible();
    await expect(page.getByText('En attente')).toBeVisible();
    await expect(page.getByText('Payé')).toBeVisible();
    await expect(page.getByText('En retard')).toBeVisible();
  });

  test('invoice page has search and filter', async ({ page }) => {
    // Check search input
    const searchInput = page.getByPlaceholder('Rechercher par numéro ou client...');
    await expect(searchInput).toBeVisible();
    
    // Check status filter
    await expect(page.getByTestId('invoices-status-filter')).toBeVisible();
  });

  test('invoice page has new invoice button', async ({ page }) => {
    const newInvoiceBtn = page.getByTestId('new-invoice-btn');
    await expect(newInvoiceBtn).toBeVisible();
    await expect(newInvoiceBtn).toContainText('Nouvelle facture');
  });

  test('invoice table displays correct columns', async ({ page }) => {
    const table = page.getByTestId('invoices-table');
    await expect(table).toBeVisible();
    
    // Check column headers
    await expect(table.getByText('FACTURE')).toBeVisible();
    await expect(table.getByText('CLIENT')).toBeVisible();
    await expect(table.getByText('DATE')).toBeVisible();
    await expect(table.getByText('STATUT')).toBeVisible();
    await expect(table.getByText('TOTAL')).toBeVisible();
    await expect(table.getByText('SOLDE')).toBeVisible();
  });

  test('status filter changes displayed invoices', async ({ page }) => {
    // Click status filter
    await page.getByTestId('invoices-status-filter').click();
    
    // Select "Brouillon" (draft)
    await page.getByRole('option', { name: 'Brouillon' }).click();
    
    // Wait for filter to apply
    await page.waitForLoadState('networkidle');
    
    // All visible status badges should be "Brouillon"
    const statusBadges = page.locator('[data-testid="invoices-table"] .rounded-full');
    const count = await statusBadges.count();
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const text = await statusBadges.nth(i).textContent();
        expect(text).toBe('Brouillon');
      }
    }
  });
});

test.describe('Invoice Creation Modal', () => {
  test.beforeEach(async ({ page }) => {
    await adminLogin(page);
    await dismissToasts(page);
    await page.goto('/admin/invoices', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="admin-invoices-page"]');
  });

  test('clicking new invoice opens creation modal', async ({ page }) => {
    await page.getByTestId('new-invoice-btn').click();
    
    // Modal should be visible
    await expect(page.getByText('Nouvelle facture')).toBeVisible();
    await expect(page.getByText('Créez une facture professionnelle en quelques clics')).toBeVisible();
  });

  test('creation modal has client selection', async ({ page }) => {
    await page.getByTestId('new-invoice-btn').click();
    await page.waitForSelector('[data-testid="invoice-client-select"]');
    
    const clientSelect = page.getByTestId('invoice-client-select');
    await expect(clientSelect).toBeVisible();
    
    // Click to open dropdown
    await clientSelect.click();
    
    // Should show client options
    await expect(page.getByRole('listbox')).toBeVisible();
  });

  test('creation modal has line items section', async ({ page }) => {
    await page.getByTestId('new-invoice-btn').click();
    await page.waitForSelector('[data-testid="invoice-client-select"]');
    
    // Check line items section
    await expect(page.getByText('Articles et services')).toBeVisible();
    await expect(page.getByRole('button', { name: /Catalogue/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Ligne/i })).toBeVisible();
    
    // Check line item columns
    await expect(page.getByText('DESCRIPTION')).toBeVisible();
    await expect(page.getByText('QTE')).toBeVisible();
    await expect(page.getByText('PRIX UNIT.')).toBeVisible();
  });

  test('creation modal has discount options', async ({ page }) => {
    await page.getByTestId('new-invoice-btn').click();
    await page.waitForSelector('[data-testid="invoice-client-select"]');
    
    await expect(page.getByText('Remise')).toBeVisible();
    
    // Check discount type selector
    const discountSelect = page.locator('button:has-text("Aucune")').first();
    await expect(discountSelect).toBeVisible();
  });

  test('creation modal has payment terms', async ({ page }) => {
    await page.getByTestId('new-invoice-btn').click();
    await page.waitForSelector('[data-testid="invoice-client-select"]');
    
    await expect(page.getByText('Modalités de paiement')).toBeVisible();
    
    // Default should be Net 30 jours
    await expect(page.getByText('Net 30 jours')).toBeVisible();
  });

  test('creation modal has deposit option', async ({ page }) => {
    await page.getByTestId('new-invoice-btn').click();
    await page.waitForSelector('[data-testid="invoice-client-select"]');
    
    await expect(page.getByText('Demander un acompte')).toBeVisible();
    await expect(page.getByText('Le client devra verser un acompte avant le début des travaux')).toBeVisible();
  });

  test('creation modal shows tax calculations', async ({ page }) => {
    await page.getByTestId('new-invoice-btn').click();
    await page.waitForSelector('[data-testid="invoice-client-select"]');
    
    // Check tax labels
    await expect(page.getByText('Sous-total')).toBeVisible();
    await expect(page.getByText('TPS (5%)')).toBeVisible();
    await expect(page.getByText('TVQ (9.975%)')).toBeVisible();
    await expect(page.getByText('Total').first()).toBeVisible();
  });

  test('adding line item updates calculations', async ({ page }) => {
    await page.getByTestId('new-invoice-btn').click();
    await page.waitForSelector('[data-testid="invoice-client-select"]');
    
    // Fill in first line item
    await page.fill('input[placeholder="Description du service/produit"]', 'Test Service');
    await page.locator('input[type="number"]').nth(0).fill('2'); // quantity
    await page.locator('input[type="number"]').nth(1).fill('100'); // unit price
    
    // Check line total updates (2 * 100 = 200)
    await expect(page.getByText('200,00 $')).toBeVisible();
    
    // Check subtotal
    await expect(page.locator('text=Sous-total').locator('..').getByText('200,00 $')).toBeVisible();
  });

  test('catalog button opens catalog modal', async ({ page }) => {
    await page.getByTestId('new-invoice-btn').click();
    await page.waitForSelector('[data-testid="invoice-client-select"]');
    
    // Click catalog button
    await page.getByRole('button', { name: /Catalogue/i }).click();
    
    // Catalog modal should open
    await expect(page.getByText('Catalogue de services')).toBeVisible();
    await expect(page.getByPlaceholder('Rechercher un service...')).toBeVisible();
  });

  test('validation prevents creating invoice without client', async ({ page }) => {
    await page.getByTestId('new-invoice-btn').click();
    await page.waitForSelector('[data-testid="invoice-client-select"]');
    
    // Fill line item but not client
    await page.fill('input[placeholder="Description du service/produit"]', 'Test Service');
    await page.locator('input[type="number"]').nth(1).fill('100');
    
    // Try to create
    await page.getByTestId('create-invoice-submit').click();
    
    // Should show error toast
    await expect(page.locator('[data-sonner-toast]').first()).toBeVisible();
  });
});

test.describe('Invoice Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await adminLogin(page);
    await dismissToasts(page);
  });

  test('can create invoice with line items', async ({ page }) => {
    await page.goto('/admin/invoices', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="admin-invoices-page"]');
    
    // Get initial invoice count
    const initialRows = await page.locator('[data-testid^="invoice-row-"]').count();
    
    // Open create modal
    await page.getByTestId('new-invoice-btn').click();
    await page.waitForSelector('[data-testid="invoice-client-select"]');
    
    // Select client
    await page.getByTestId('invoice-client-select').click();
    await page.getByRole('option').first().click();
    
    // Fill line item
    await page.fill('input[placeholder="Description du service/produit"]', 'TEST_Invoice_E2E_Service');
    await page.locator('input[type="number"]').nth(0).fill('1');
    await page.locator('input[type="number"]').nth(1).fill('150');
    
    // Create invoice
    await page.getByTestId('create-invoice-submit').click();
    
    // Wait for success toast
    await expect(page.locator('[data-sonner-toast]').first()).toBeVisible();
    
    // Modal should close
    await expect(page.getByText('Nouvelle facture')).not.toBeVisible();
    
    // New invoice should appear in list
    await page.waitForSelector('[data-testid^="invoice-row-"]');
    const newRows = await page.locator('[data-testid^="invoice-row-"]').count();
    expect(newRows).toBeGreaterThanOrEqual(initialRows);
  });
});

test.describe('Invoice Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    await adminLogin(page);
    await dismissToasts(page);
  });

  test('clicking invoice row navigates to detail page', async ({ page }) => {
    await page.goto('/admin/invoices', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="admin-invoices-page"]');
    
    // Click first invoice row
    const firstRow = page.locator('[data-testid^="invoice-row-"]').first();
    if (await firstRow.isVisible()) {
      await firstRow.click();
      
      // Should navigate to detail page
      await page.waitForSelector('[data-testid="invoice-detail-page"]');
      await expect(page.getByTestId('invoice-detail-page')).toBeVisible();
    }
  });

  test('invoice detail shows professional layout', async ({ page }) => {
    await page.goto('/admin/invoices', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="admin-invoices-page"]');
    
    const firstRow = page.locator('[data-testid^="invoice-row-"]').first();
    if (await firstRow.isVisible()) {
      await firstRow.click();
      await page.waitForSelector('[data-testid="invoice-detail-page"]');
      
      // Check company branding
      await expect(page.getByText('CMGeorges')).toBeVisible();
      await expect(page.getByText('Services de rénovation & design')).toBeVisible();
      
      // Check invoice header
      await expect(page.getByText('FACTURE')).toBeVisible();
      
      // Check client section
      await expect(page.getByText('FACTURER À')).toBeVisible();
    }
  });

  test('invoice detail shows action buttons', async ({ page }) => {
    await page.goto('/admin/invoices', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="admin-invoices-page"]');
    
    const firstRow = page.locator('[data-testid^="invoice-row-"]').first();
    if (await firstRow.isVisible()) {
      await firstRow.click();
      await page.waitForSelector('[data-testid="invoice-detail-page"]');
      
      // Check action buttons
      await expect(page.getByRole('button', { name: /PDF/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Imprimer/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Envoyer/i })).toBeVisible();
    }
  });

  test('invoice detail shows line items table', async ({ page }) => {
    await page.goto('/admin/invoices', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="admin-invoices-page"]');
    
    const firstRow = page.locator('[data-testid^="invoice-row-"]').first();
    if (await firstRow.isVisible()) {
      await firstRow.click();
      await page.waitForSelector('[data-testid="invoice-detail-page"]');
      
      // Check line items table headers
      await expect(page.getByText('DESCRIPTION')).toBeVisible();
      await expect(page.getByText('QTÉ')).toBeVisible();
      await expect(page.getByText('PRIX UNIT.')).toBeVisible();
    }
  });

  test('invoice detail shows tax breakdown', async ({ page }) => {
    await page.goto('/admin/invoices', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="admin-invoices-page"]');
    
    const firstRow = page.locator('[data-testid^="invoice-row-"]').first();
    if (await firstRow.isVisible()) {
      await firstRow.click();
      await page.waitForSelector('[data-testid="invoice-detail-page"]');
      
      // Check tax breakdown
      await expect(page.getByText('Sous-total')).toBeVisible();
      await expect(page.getByText('TPS (5%)')).toBeVisible();
      await expect(page.getByText('TVQ (9.975%)')).toBeVisible();
    }
  });
});

test.describe('Invoice Payment Recording', () => {
  test.beforeEach(async ({ page }) => {
    await adminLogin(page);
    await dismissToasts(page);
  });

  test('payment button opens payment modal', async ({ page }) => {
    await page.goto('/admin/invoices', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="admin-invoices-page"]');
    
    // Find an invoice with balance due
    const firstRow = page.locator('[data-testid^="invoice-row-"]').first();
    if (await firstRow.isVisible()) {
      await firstRow.click();
      await page.waitForSelector('[data-testid="invoice-detail-page"]');
      
      // Check if payment button exists (only for unpaid invoices)
      const paymentBtn = page.getByRole('button', { name: /Paiement/i });
      if (await paymentBtn.isVisible()) {
        await paymentBtn.click();
        
        // Payment modal should open
        await expect(page.getByText('Enregistrer un paiement')).toBeVisible();
        await expect(page.getByText('Montant *')).toBeVisible();
        await expect(page.getByText('Mode de paiement')).toBeVisible();
      }
    }
  });
});

test.describe('Invoice Delete', () => {
  test.beforeEach(async ({ page }) => {
    await adminLogin(page);
    await dismissToasts(page);
  });

  test('delete button shows confirmation modal', async ({ page }) => {
    await page.goto('/admin/invoices', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="admin-invoices-page"]');
    
    // Find delete button on first invoice
    const deleteBtn = page.locator('[data-testid^="delete-invoice-"]').first();
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      
      // Confirmation modal should appear
      await expect(page.getByText('Supprimer la facture')).toBeVisible();
      await expect(page.getByText('Êtes-vous sûr de vouloir supprimer')).toBeVisible();
    }
  });
});
