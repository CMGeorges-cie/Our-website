import { test, expect } from '@playwright/test';

const BASE_URL = 'https://serviceflow-preview.preview.emergentagent.com';
const ADMIN_EMAIL = 'admin@cmgeorges.com';
const ADMIN_PASSWORD = 'strongpassword123';

test.describe('Admin Login & Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Remove emergent badge
    await page.addLocatorHandler(
      page.locator('[class*="emergent"], [id*="emergent-badge"]'),
      async (badge) => {
        await badge.evaluate(el => el.remove());
      }
    );
  });

  test('Admin login page renders correctly', async ({ page }) => {
    await page.goto('/admin/login', { waitUntil: 'domcontentloaded' });
    
    // Verify page elements
    await expect(page.getByTestId('admin-login-page')).toBeVisible();
    await expect(page.getByTestId('login-card')).toBeVisible();
    await expect(page.getByTestId('login-email')).toBeVisible();
    await expect(page.getByTestId('login-password')).toBeVisible();
    await expect(page.getByTestId('login-submit-btn')).toBeVisible();
    await expect(page.getByTestId('client-portal-link')).toBeVisible();
    await expect(page.getByTestId('seed-database-btn')).toBeVisible();
  });

  test('Admin login with valid credentials', async ({ page }) => {
    await page.goto('/admin/login', { waitUntil: 'domcontentloaded' });
    
    // Fill credentials
    await page.getByTestId('login-email').fill(ADMIN_EMAIL);
    await page.getByTestId('login-password').fill(ADMIN_PASSWORD);
    
    // Click login
    await page.getByTestId('login-submit-btn').click();
    
    // Wait for redirect to dashboard
    await page.waitForURL(/\/admin\/dashboard/);
    
    // Verify dashboard loaded
    await expect(page.getByTestId('admin-dashboard')).toBeVisible();
  });

  test('Admin login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/admin/login', { waitUntil: 'domcontentloaded' });
    
    // Fill invalid credentials
    await page.getByTestId('login-email').fill(ADMIN_EMAIL);
    await page.getByTestId('login-password').fill('wrongpassword');
    
    // Click login
    await page.getByTestId('login-submit-btn').click();
    
    // Should stay on login page
    await expect(page).toHaveURL(/\/admin\/login/);
    
    // Error toast should appear (sonner toast)
    await expect(page.locator('[data-sonner-toast]').first()).toBeVisible();
  });

  test('Admin dashboard shows stats cards', async ({ page }) => {
    // Login first
    await page.goto('/admin/login', { waitUntil: 'domcontentloaded' });
    await page.getByTestId('login-email').fill(ADMIN_EMAIL);
    await page.getByTestId('login-password').fill(ADMIN_PASSWORD);
    await page.getByTestId('login-submit-btn').click();
    await page.waitForURL(/\/admin\/dashboard/);
    
    // Wait for dashboard to load
    await expect(page.getByTestId('admin-dashboard')).toBeVisible();
    
    // Check stats cards
    await expect(page.getByTestId('stat-card-total-leads')).toBeVisible();
    await expect(page.getByTestId('conversion-card')).toBeVisible();
    await expect(page.getByTestId('quick-actions-card')).toBeVisible();
  });

  test('Client portal link navigates correctly', async ({ page }) => {
    await page.goto('/admin/login', { waitUntil: 'domcontentloaded' });
    
    // Click client portal link
    await page.getByTestId('client-portal-link').click();
    
    // Should navigate to client login
    await expect(page).toHaveURL(/\/client\/login/);
  });

  test('Seed database button works', async ({ page }) => {
    await page.goto('/admin/login', { waitUntil: 'domcontentloaded' });
    
    // Click seed database
    await page.getByTestId('seed-database-btn').click();
    
    // Wait for toast (either success or info message)
    await expect(page.locator('[data-sonner-toast]').first()).toBeVisible();
  });
});

test.describe('API v2 Integration', () => {
  test('V2 Auth login returns valid token', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/v2/auth/login`, {
      data: {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
      }
    });
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    
    expect(data.access_token).toBeTruthy();
    expect(data.refresh_token).toBeTruthy();
    expect(data.token_type).toBe('bearer');
    expect(data.user.email).toBe(ADMIN_EMAIL);
  });

  test('V2 Auth me endpoint returns user info', async ({ request }) => {
    // Login first
    const loginResponse = await request.post(`${BASE_URL}/api/v2/auth/login`, {
      data: {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
      }
    });
    const { access_token } = await loginResponse.json();
    
    // Test /me endpoint
    const response = await request.get(`${BASE_URL}/api/v2/auth/me`, {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    
    expect(data.email).toBe(ADMIN_EMAIL);
    expect(data.role).toBe('admin');
    expect(data.id).toBeTruthy();
  });

  test('V2 Mobile dashboard returns correct data', async ({ request }) => {
    // Login first
    const loginResponse = await request.post(`${BASE_URL}/api/v2/auth/login`, {
      data: {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
      }
    });
    const { access_token } = await loginResponse.json();
    
    // Test mobile dashboard
    const response = await request.get(`${BASE_URL}/api/v2/mobile/dashboard`, {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    
    expect(typeof data.todays_projects).toBe('number');
    expect(typeof data.active_projects).toBe('number');
    expect(typeof data.completed_this_week).toBe('number');
    expect(typeof data.hours_this_week).toBe('number');
    expect(typeof data.unread_messages).toBe('number');
    expect(data.user_name).toBeTruthy();
  });

  test('V2 Projects list endpoint works', async ({ request }) => {
    // Login first
    const loginResponse = await request.post(`${BASE_URL}/api/v2/auth/login`, {
      data: {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
      }
    });
    const { access_token } = await loginResponse.json();
    
    // Test projects list
    const response = await request.get(`${BASE_URL}/api/v2/projects`, {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    
    expect(Array.isArray(data)).toBe(true);
  });

  test('V2 My assignments endpoint works', async ({ request }) => {
    // Login first
    const loginResponse = await request.post(`${BASE_URL}/api/v2/auth/login`, {
      data: {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
      }
    });
    const { access_token } = await loginResponse.json();
    
    // Test my assignments
    const response = await request.get(`${BASE_URL}/api/v2/projects/my-assignments`, {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    
    expect(Array.isArray(data)).toBe(true);
  });

  test('V2 Sync today endpoint works', async ({ request }) => {
    // Login first
    const loginResponse = await request.post(`${BASE_URL}/api/v2/auth/login`, {
      data: {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
      }
    });
    const { access_token } = await loginResponse.json();
    
    // Test sync today
    const response = await request.get(`${BASE_URL}/api/v2/mobile/sync/today`, {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    
    expect(data.date).toBeTruthy();
    expect(Array.isArray(data.projects)).toBe(true);
    expect(typeof data.total).toBe('number');
  });

  test('V2 Token refresh works', async ({ request }) => {
    // Login first
    const loginResponse = await request.post(`${BASE_URL}/api/v2/auth/login`, {
      data: {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
      }
    });
    const { refresh_token } = await loginResponse.json();
    
    // Test refresh
    const response = await request.post(`${BASE_URL}/api/v2/auth/refresh`, {
      data: {
        refresh_token: refresh_token
      }
    });
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    
    expect(data.access_token).toBeTruthy();
    expect(data.refresh_token).toBeTruthy();
  });

  test('V2 Endpoints reject unauthorized requests', async ({ request }) => {
    // Test without auth token
    const dashboardResponse = await request.get(`${BASE_URL}/api/v2/mobile/dashboard`);
    expect(dashboardResponse.status()).toBe(403);
    
    const projectsResponse = await request.get(`${BASE_URL}/api/v2/projects`);
    expect(projectsResponse.status()).toBe(403);
  });
});

test.describe('Multi-tenant Isolation Verification', () => {
  test('JWT token contains tenant_id', async ({ request }) => {
    const loginResponse = await request.post(`${BASE_URL}/api/v2/auth/login`, {
      data: {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
      }
    });
    
    expect(loginResponse.status()).toBe(200);
    const { access_token } = await loginResponse.json();
    
    // Decode JWT payload (base64)
    const payload = JSON.parse(Buffer.from(access_token.split('.')[1], 'base64').toString());
    
    expect(payload.tenant_id).toBe('default');
    expect(payload.email).toBe(ADMIN_EMAIL);
    expect(payload.role).toBe('admin');
  });
});
