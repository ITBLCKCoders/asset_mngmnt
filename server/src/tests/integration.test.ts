import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../index.js';
import { pool } from '../db.js';
import { generateTokens } from '../auth/tokens.js';

describe('Asset Management API Integration Tests', () => {
  let authToken: string;
  let testUserId: string;

  beforeAll(async () => {
    // Create test user and get auth token
    const [userRows] = (await pool.execute(
      'INSERT INTO users (email, first_name, last_name, employee_number, is_active) VALUES (?, ?, ?, ?, ?)',
      ['test@example.com', 'Test', 'User', 'TEST001', 1]
    )) as any[];

    testUserId = userRows.insertId;

    const tokens = await generateTokens(testUserId, 'test@example.com', {
      ip: '127.0.0.1',
      headers: {},
    } as any);
    authToken = tokens.accessToken;
  });

  afterAll(async () => {
    // Clean up test data
    await pool.execute('DELETE FROM users WHERE email = ?', [
      'test@example.com',
    ]);
  });

  describe('Authentication', () => {
    it('should require authentication for protected routes', async () => {
      const response = await request(app).get('/api/assets').expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should accept valid JWT tokens', async () => {
      const response = await request(app)
        .get('/api/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('assets');
    });
  });

  describe('Assets CRUD', () => {
    let createdAssetId: string;

    it('should create a new asset', async () => {
      const assetData = {
        name: 'Test Laptop',
        description: 'Test asset for integration testing',
        categoryId: '1',
        supplier: 'Test Supplier',
        brand: 'Test Brand',
        model: 'Test Model',
        serial: 'TEST123456',
        status: 'Available',
        condition: 'Good',
      };

      const response = await request(app)
        .post('/api/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .field('name', assetData.name)
        .field('description', assetData.description)
        .field('categoryId', assetData.categoryId)
        .field('supplier', assetData.supplier)
        .field('brand', assetData.brand)
        .field('model', assetData.model)
        .field('serial', assetData.serial)
        .field('status', assetData.status)
        .field('condition', assetData.condition)
        .expect(201);

      expect(response.body).toHaveProperty(
        'message',
        'Asset created successfully'
      );
      expect(response.body.asset).toHaveProperty('asset_code');
      expect(response.body.asset.name).toBe(assetData.name);

      createdAssetId = response.body.asset.asset_code;
    });

    it('should get all assets', async () => {
      const response = await request(app)
        .get('/api/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('assets');
      expect(Array.isArray(response.body.assets)).toBe(true);
    });

    it('should get asset by ID', async () => {
      const response = await request(app)
        .get(`/api/assets/${createdAssetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.assets).toHaveLength(1);
      expect(response.body.assets[0].asset_code).toBe(createdAssetId);
    });

    it('should update an asset', async () => {
      const updateData = {
        name: 'Updated Test Laptop',
        description: 'Updated test asset description',
        status: 'In Use',
      };

      const response = await request(app)
        .put(`/api/assets/${createdAssetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .field('name', updateData.name)
        .field('description', updateData.description)
        .field('status', updateData.status)
        .expect(200);

      expect(response.body).toHaveProperty(
        'message',
        'Asset updated successfully'
      );
      expect(response.body.asset.name).toBe(updateData.name);
    });

    it('should delete an asset', async () => {
      const response = await request(app)
        .delete(`/api/assets/${createdAssetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty(
        'message',
        'Asset deleted successfully'
      );
    });
  });

  describe('Users CRUD', () => {
    let createdUserId: string;

    it('should create a new user', async () => {
      const userData = {
        email: 'newuser@example.com',
        first_name: 'New',
        last_name: 'User',
        employee_number: 'NEW001',
        is_active: true,
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty(
        'message',
        'User created successfully'
      );
      expect(response.body.user).toHaveProperty('userID');
      expect(response.body.user.email).toBe(userData.email);

      createdUserId = response.body.user.userID;
    });

    it('should get all users', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('users');
      expect(Array.isArray(response.body.users)).toBe(true);
    });

    it('should update a user', async () => {
      const updateData = {
        email: 'updateduser@example.com',
        first_name: 'Updated',
        last_name: 'User',
        is_active: false,
      };

      const response = await request(app)
        .put(`/api/users/${createdUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty(
        'message',
        'User updated successfully'
      );
      expect(response.body.user.email).toBe(updateData.email);
    });

    it('should delete a user', async () => {
      const response = await request(app)
        .delete(`/api/users/${createdUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty(
        'message',
        'User deleted successfully'
      );
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/api/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to auth endpoints', async () => {
      // Make multiple requests to trigger rate limiting
      const requests = Array(6)
        .fill(null)
        .map(() =>
          request(app)
            .post('/api/auth/login')
            .send({ email: 'test@example.com', password: 'wrongpassword' })
        );

      const responses = await Promise.all(requests);

      // Should get rate limited after 5 attempts
      const rateLimitedResponses = responses.filter(
        (res: any) => res.status === 429
      );
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Input Validation', () => {
    it('should validate required fields for asset creation', async () => {
      const response = await request(app)
        .post('/api/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should validate email format for user creation', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: 'invalid-email',
          first_name: 'Test',
          last_name: 'User',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent asset', async () => {
      const response = await request(app)
        .get('/api/assets/NONEXISTENT')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error).toBeDefined();
    });

    it('should handle database errors gracefully', async () => {
      // This test would require mocking the database to simulate errors
      // For now, we'll test with invalid data that should trigger validation errors
      const response = await request(app)
        .post('/api/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '', // Empty name should trigger validation error
          categoryId: 'invalid-uuid',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });
});
