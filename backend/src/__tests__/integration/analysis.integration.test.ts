import request from 'supertest';
import { app } from '../../app';

describe('Analysis API Integration Tests', () => {
  describe('POST /api/analysis/public', () => {
    it('should analyze a contract successfully', async () => {
      const contractCode = `
        pragma solidity ^0.8.0;
        contract TestContract {
            uint256 public value;
            function setValue(uint256 _value) public {
                value = _value;
            }
        }
      `;

      const response = await request(app)
        .post('/api/analysis/public')
        .send({ contractCode })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data).toHaveProperty('vulnerabilities');
    });

    it('should reject request without contract code', async () => {
      const response = await request(app)
        .post('/api/analysis/public')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });
  });

  describe('GET /api/analysis/:id', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/analysis/test-id')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });
  });
});
