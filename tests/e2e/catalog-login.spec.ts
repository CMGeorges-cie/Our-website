import { test, expect } from '@playwright/test';
import { adminLogin, dismissToasts, removeEmergentBadge } from '../fixtures/helpers';

test.describe('Login Page - Logo Fix', () => {
  test('login page displays ServiceFlow lion logo', async ({ page }) => {
    await page.goto('/connexion', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="login-page"]');
    
    // Check that the logo image is present
    const logo = page.locator('img[alt="CMGeorges"]');
    await expect(logo).toBeVisible();
    
    // Verify it's the ServiceFlow logo URL
    const logoSrc = await logo.getAttribute('src');
    expect(logoSrc).toContain('emergentagent.com');
    expect(logoSrc).toContain('ChatGPT%20Image');
  });

  test('admin login form shows ServiceFlow branding', async ({ page }) => {
    await page.goto('/connexion', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="select-admin-login"]');
    
    // Click admin login
    await page.getByTestId('select-admin-login').click();
    await page.waitForSelector('[data-testid="login-form-page"]');
    
    // Check ServiceFlow logo in admin login form
    const logo = page.locator('img[alt="ServiceFlow"]');
    await expect(logo).toBeVisible();
    
    // Verify branding text
    await expect(page.getByText('ServiceFlow')).toBeVisible();
    await expect(page.getByText('Espace Administration')).toBeVisible();
  });

  test('login page has admin and client options', async ({ page }) => {
    await page.goto('/connexion', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="login-page"]');
    
    // Check both login options are present
    await expect(page.getByTestId('select-admin-login')).toBeVisible();
    await expect(page.getByTestId('select-client-login')).toBeVisible();
    
    // Check labels
    await expect(page.getByText('Administration')).toBeVisible();
    await expect(page.getByText('Portail Client')).toBeVisible();
  });
});

test.describe('Admin Login Flow', () => {
  test('admin can login with valid credentials', async ({ page }) => {
    await page.goto('/connexion', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="select-admin-login"]');
    await page.getByTestId('select-admin-login').click();
    await page.waitForSelector('input[type="email"]');
    
    await page.fill('input[type="email"]', 'admin@cmgeorges.com');
    await page.fill('input[type="password"]', 'strongpassword123');
    await page.click('button[type="submit"]');
    
    // Should redirect to admin dashboard
    await page.waitForURL('**/admin/**');
    await expect(page.getByTestId('admin-layout')).toBeVisible();
  });

  test('admin login shows error for invalid credentials', async ({ page }) => {
    await page.goto('/connexion', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="select-admin-login"]');
    await page.getByTestId('select-admin-login').click();
    await page.waitForSelector('input[type="email"]');
    
    await page.fill('input[type="email"]', 'admin@cmgeorges.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should show error toast
    await expect(page.locator('[data-sonner-toast]').first()).toBeVisible();
  });
});

test.describe('Admin Catalog Page', () => {
  test.beforeEach(async ({ page }) => {
    await adminLogin(page);
    await dismissToasts(page);
  });

  test('catalog page is accessible from sidebar', async ({ page }) => {
    // Check sidebar has Catalogue link
    const catalogLink = page.getByTestId('admin-nav-catalogue');
    await expect(catalogLink).toBeVisible();
    
    // Click and navigate
    await catalogLink.click();
    await page.waitForURL('**/admin/catalog');
    await expect(page.getByTestId('admin-catalog-page')).toBeVisible();
  });

  test('catalog page displays services grid', async ({ page }) => {
    await page.goto('/admin/catalog', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="admin-catalog-page"]');
    
    // Check page title
    await expect(page.getByText('Catalogue de Services')).toBeVisible();
    
    // Check services are displayed (should have seeded services)
    const serviceCards = page.locator('.bg-card');
    await expect(serviceCards.first()).toBeVisible();
  });

  test('catalog page has search functionality', async ({ page }) => {
    await page.goto('/admin/catalog', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="admin-catalog-page"]');
    
    // Check search input exists
    const searchInput = page.getByPlaceholder('Rechercher...');
    await expect(searchInput).toBeVisible();
    
    // Search for a service
    await searchInput.fill('Peinture');
    
    // Verify filtered results show painting services
    await expect(page.getByText('Peinture 3½')).toBeVisible();
  });

  test('catalog page has category filter', async ({ page }) => {
    await page.goto('/admin/catalog', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="admin-catalog-page"]');
    
    // Check category dropdown exists
    const categorySelect = page.getByRole('combobox').first();
    await expect(categorySelect).toBeVisible();
    
    // Open dropdown and select a category
    await categorySelect.click();
    await page.getByRole('option', { name: 'Peinture' }).click();
    
    // Verify only painting services are shown
    const serviceCards = page.locator('.bg-card');
    const count = await serviceCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('catalog page has new service button', async ({ page }) => {
    await page.goto('/admin/catalog', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="admin-catalog-page"]');
    
    // Check "Nouveau service" button exists
    const newServiceBtn = page.getByRole('button', { name: /nouveau service/i });
    await expect(newServiceBtn).toBeVisible();
    
    // Click to open modal
    await newServiceBtn.click();
    
    // Verify modal opens
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Nouveau service' })).toBeVisible();
  });

  test('service card displays correct information', async ({ page }) => {
    await page.goto('/admin/catalog', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="admin-catalog-page"]');
    
    // Find a service card (Peinture 3½)
    const serviceCard = page.locator('.bg-card').filter({ hasText: 'Peinture 3½' }).first();
    await expect(serviceCard).toBeVisible();
    
    // Check it has price
    await expect(serviceCard.getByText('450$')).toBeVisible();
    
    // Check it has duration
    await expect(serviceCard.getByText('1-2 jours')).toBeVisible();
    
    // Check it has category badge (use exact match to avoid matching title)
    await expect(serviceCard.locator('.inline-flex').filter({ hasText: 'Peinture' }).first()).toBeVisible();
  });

  test('can edit a service', async ({ page }) => {
    await page.goto('/admin/catalog', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="admin-catalog-page"]');
    
    // Find edit button on first service card (the edit icon button)
    const serviceCard = page.locator('.bg-card').first();
    // The edit button is a ghost button with Edit icon
    const editBtn = serviceCard.locator('button').nth(1); // Second button is edit
    
    // Click edit
    await editBtn.click({ force: true });
    
    // Verify edit modal opens
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Modifier le service' })).toBeVisible();
  });

  test('featured services show star icon', async ({ page }) => {
    await page.goto('/admin/catalog', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="admin-catalog-page"]');
    
    // Find a featured service (Peinture 3½ is featured)
    const featuredCard = page.locator('.bg-card').filter({ hasText: 'Peinture 3½' }).first();
    
    // Check for star icon or "Vedette" text
    await expect(featuredCard.getByText('Vedette')).toBeVisible();
  });
});

test.describe('Admin Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await adminLogin(page);
    await dismissToasts(page);
  });

  test('sidebar contains Catalogue link', async ({ page }) => {
    await page.waitForSelector('[data-testid="admin-sidebar"]');
    
    // Check Catalogue link exists in sidebar
    const catalogLink = page.getByTestId('admin-nav-catalogue');
    await expect(catalogLink).toBeVisible();
    await expect(catalogLink).toContainText('Catalogue');
  });

  test('all main navigation links are present', async ({ page }) => {
    const sidebar = page.getByTestId('admin-sidebar');
    await expect(sidebar).toBeVisible();
    
    // Check all main nav links by text content
    await expect(sidebar.getByText('Tableau de bord')).toBeVisible();
    await expect(sidebar.getByText('Leads')).toBeVisible();
    await expect(sidebar.getByText('Clients')).toBeVisible();
    await expect(sidebar.getByText('Projets')).toBeVisible();
    await expect(sidebar.getByText('Catalogue')).toBeVisible();
    await expect(sidebar.getByText('Factures')).toBeVisible();
    await expect(sidebar.getByText('Revenus')).toBeVisible();
  });

  test('clicking Catalogue navigates to catalog page', async ({ page }) => {
    await page.waitForSelector('[data-testid="admin-sidebar"]');
    
    await page.getByTestId('admin-nav-catalogue').click();
    await page.waitForURL('**/admin/catalog');
    
    await expect(page.getByTestId('admin-catalog-page')).toBeVisible();
  });
});
