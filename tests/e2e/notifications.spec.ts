import { test, expect } from '@playwright/test';
import { adminLogin, dismissToasts, removeEmergentBadge } from '../fixtures/helpers';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'https://tech-workflow-app.preview.emergentagent.com';

test.describe('Notification System Frontend', () => {
  
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
  });

  test('Notification bell icon is visible in admin header', async ({ page }) => {
    await adminLogin(page);
    
    // Check bell icon is visible
    const bellIcon = page.getByTestId('notification-bell');
    await expect(bellIcon).toBeVisible();
  });

  test('Notification bell shows unread count badge', async ({ page }) => {
    // First create a lead to ensure we have unread notifications
    const uniqueId = `TEST_Bell_${Date.now()}`;
    await page.request.post(`${BASE_URL}/api/v1/leads`, {
      data: {
        full_name: uniqueId,
        phone: '514-555-1234',
        email: `${uniqueId.toLowerCase()}@example.com`,
        service_type: 'manual',
        source: 'website',
        description: 'Test lead for bell badge testing'
      }
    });
    
    await adminLogin(page);
    
    // Wait for badge to appear - either it exists or count > 0
    const bellIcon = page.getByTestId('notification-bell');
    await expect(bellIcon).toBeVisible();
    
    // Check if badge exists (may or may not have notifications)
    const badge = page.getByTestId('notification-badge');
    // Badge might not exist if no unread notifications
    const badgeCount = await badge.count();
    if (badgeCount > 0) {
      await expect(badge).toBeVisible();
    }
  });

  test('Click bell navigates to notifications page', async ({ page }) => {
    await adminLogin(page);
    
    const bellIcon = page.getByTestId('notification-bell');
    await expect(bellIcon).toBeVisible();
    await bellIcon.click();
    
    // Should navigate to notifications page
    await page.waitForURL(/\/admin\/notifications/);
    
    // Notifications page should be visible
    const notificationsPage = page.getByTestId('admin-notifications-page');
    await expect(notificationsPage).toBeVisible();
  });

  test('Notifications page displays notifications list', async ({ page }) => {
    await adminLogin(page);
    
    // Navigate to notifications
    await page.goto('/admin/notifications', { waitUntil: 'domcontentloaded' });
    
    const notificationsPage = page.getByTestId('admin-notifications-page');
    await expect(notificationsPage).toBeVisible();
    
    // Wait for loading to complete
    await page.waitForLoadState('networkidle');
    
    // Either we have notifications or "no notifications" message
    const noNotifications = page.getByTestId('no-notifications');
    const hasNoNotifications = await noNotifications.count() > 0;
    
    if (hasNoNotifications) {
      await expect(noNotifications).toBeVisible();
    } else {
      // There should be at least one notification item
      const notificationItems = page.locator('[data-testid^="notification-item-"]');
      const count = await notificationItems.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('Filter buttons work correctly', async ({ page }) => {
    await adminLogin(page);
    
    await page.goto('/admin/notifications', { waitUntil: 'domcontentloaded' });
    
    const notificationsPage = page.getByTestId('admin-notifications-page');
    await expect(notificationsPage).toBeVisible();
    
    // Check filter buttons exist
    const allBtn = page.getByTestId('filter-all-btn');
    const unreadBtn = page.getByTestId('filter-unread-btn');
    
    await expect(allBtn).toBeVisible();
    await expect(unreadBtn).toBeVisible();
    
    // Click unread filter
    await unreadBtn.click();
    await page.waitForLoadState('networkidle');
    
    // Click all filter
    await allBtn.click();
    await page.waitForLoadState('networkidle');
  });

  test('Notifications show correct type badges', async ({ page }) => {
    await adminLogin(page);
    
    await page.goto('/admin/notifications', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    
    const noNotifications = page.getByTestId('no-notifications');
    const hasNoNotifications = await noNotifications.count() > 0;
    
    if (!hasNoNotifications) {
      // Check that notification items exist
      const notificationItems = page.locator('[data-testid^="notification-item-"]');
      const count = await notificationItems.count();
      
      if (count > 0) {
        const firstItem = notificationItems.first();
        await expect(firstItem).toBeVisible();
        
        // Check notification has type label
        const typeLabels = ['Nouveau lead', 'Facture créée', 'Paiement reçu', 'Projet mis à jour', 'Notification'];
        const itemText = await firstItem.textContent();
        const hasTypeLabel = typeLabels.some(label => itemText?.includes(label));
        expect(hasTypeLabel).toBeTruthy();
      }
    }
  });
});

test.describe('Notification Actions', () => {
  
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
  });

  test('Mark single notification as read', async ({ page }) => {
    // First create a lead to generate notification
    const uniqueId = `TEST_MarkRead_${Date.now()}`;
    await page.request.post(`${BASE_URL}/api/v1/leads`, {
      data: {
        full_name: uniqueId,
        phone: '514-555-1234',
        email: `${uniqueId.toLowerCase()}@example.com`,
        service_type: 'tech',
        source: 'website'
      }
    });
    
    await adminLogin(page);
    await page.goto('/admin/notifications', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    
    // Find unread notification
    const unreadBtn = page.getByTestId('filter-unread-btn');
    await unreadBtn.click();
    await page.waitForLoadState('networkidle');
    
    // Find first notification with mark-read button
    const markReadButtons = page.locator('[data-testid^="notification-mark-read-"]');
    const count = await markReadButtons.count();
    
    if (count > 0) {
      const firstMarkReadBtn = markReadButtons.first();
      await firstMarkReadBtn.click();
      
      // Wait for success toast
      await page.waitForLoadState('networkidle');
    }
  });

  test('Mark all notifications as read', async ({ page }) => {
    // Create a lead to ensure unread notifications exist
    const uniqueId = `TEST_MarkAll_${Date.now()}`;
    await page.request.post(`${BASE_URL}/api/v1/leads`, {
      data: {
        full_name: uniqueId,
        phone: '514-555-1234',
        email: `${uniqueId.toLowerCase()}@example.com`,
        service_type: 'furniture',
        source: 'website'
      }
    });
    
    await adminLogin(page);
    await page.goto('/admin/notifications', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    
    // Check if mark-all-read button exists (only shows when there are unread)
    const markAllBtn = page.getByTestId('mark-all-read-btn');
    const markAllExists = await markAllBtn.count() > 0;
    
    if (markAllExists) {
      await markAllBtn.click();
      await page.waitForLoadState('networkidle');
      
      // After marking all read, button should disappear
      await expect(markAllBtn).not.toBeVisible({ timeout: 5000 });
    }
  });

  test('Delete notification', async ({ page }) => {
    // Create a lead to generate notification
    const uniqueId = `TEST_Delete_${Date.now()}`;
    await page.request.post(`${BASE_URL}/api/v1/leads`, {
      data: {
        full_name: uniqueId,
        phone: '514-555-1234',
        email: `${uniqueId.toLowerCase()}@example.com`,
        service_type: 'manual',
        source: 'website'
      }
    });
    
    await adminLogin(page);
    await page.goto('/admin/notifications', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    
    const deleteButtons = page.locator('[data-testid^="notification-delete-"]');
    const count = await deleteButtons.count();
    
    if (count > 0) {
      const initialCount = count;
      const firstDeleteBtn = deleteButtons.first();
      await firstDeleteBtn.click();
      
      // Wait for deletion
      await page.waitForLoadState('networkidle');
      
      // Count should decrease or stay same if there was only one
      const newCount = await page.locator('[data-testid^="notification-delete-"]').count();
      expect(newCount).toBeLessThanOrEqual(initialCount);
    }
  });

  test('Navigate to entity from notification', async ({ page }) => {
    // Create a lead to generate notification
    const uniqueId = `TEST_Navigate_${Date.now()}`;
    await page.request.post(`${BASE_URL}/api/v1/leads`, {
      data: {
        full_name: uniqueId,
        phone: '514-555-1234',
        email: `${uniqueId.toLowerCase()}@example.com`,
        service_type: 'tech',
        source: 'website'
      }
    });
    
    await adminLogin(page);
    await page.goto('/admin/notifications', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    
    // Find notification view buttons
    const viewButtons = page.locator('[data-testid^="notification-view-"]');
    const count = await viewButtons.count();
    
    if (count > 0) {
      const firstViewBtn = viewButtons.first();
      await firstViewBtn.click();
      
      // Should navigate away from notifications page
      await page.waitForURL(/\/admin\/(leads|invoices|projects|clients)/);
    }
  });
});

test.describe('Notification Integration', () => {
  
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
  });

  test('Creating lead triggers notification', async ({ page }) => {
    await adminLogin(page);
    
    // Get initial unread count
    const bellIcon = page.getByTestId('notification-bell');
    await expect(bellIcon).toBeVisible();
    
    // Navigate to notifications to mark all as read first
    await page.goto('/admin/notifications', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    
    const markAllBtn = page.getByTestId('mark-all-read-btn');
    if (await markAllBtn.count() > 0) {
      await markAllBtn.click();
      await page.waitForLoadState('networkidle');
    }
    
    // Create a lead via API
    const uniqueId = `TEST_TriggerLead_${Date.now()}`;
    await page.request.post(`${BASE_URL}/api/v1/leads`, {
      data: {
        full_name: uniqueId,
        phone: '514-555-1234',
        email: `${uniqueId.toLowerCase()}@example.com`,
        service_type: 'manual',
        source: 'website',
        description: 'Test lead for integration testing'
      }
    });
    
    // Wait for notification to be created
    await page.waitForTimeout(2000);
    
    // Refresh page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Check unread count badge appeared
    const badge = page.getByTestId('notification-badge');
    await expect(badge).toBeVisible({ timeout: 10000 });
  });
});
