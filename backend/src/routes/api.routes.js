import { Router } from 'express';
import { initializeDatabase, pool } from '../config/database.js';

const router = Router();
router.use(async (_request, _response, next) => {
  try {
    await initializeDatabase();
    next();
  } catch (error) {
    next(error);
  }
});

router.get('/records', async (_request, response, next) => {
  try {
    const result = await pool.query(
      'SELECT id, title, details, created_at AS "createdAt" FROM records ORDER BY created_at DESC, id DESC',
    );
    response.json({ records: result.rows });
  } catch (error) {
    next(error);
  }
});

router.post('/records', async (request, response, next) => {
  const title = typeof request.body?.title === 'string' ? request.body.title.trim() : '';
  const details = typeof request.body?.details === 'string' ? request.body.details.trim() : '';
  if (!title || title.length > 120 || details.length > 5000) {
    return response.status(400).json({ error: 'Title is required (up to 120 characters); details may be up to 5000 characters.' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO records (title, details) VALUES ($1, $2) RETURNING id, title, details, created_at AS "createdAt"',
      [title, details],
    );
    response.status(201).json({ record: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

router.delete('/records/:id', async (request, response, next) => {
  if (!/^\d+$/.test(request.params.id)) {
    return response.status(400).json({ error: 'Record id must be a positive integer.' });
  }
  try {
    const result = await pool.query('DELETE FROM records WHERE id = $1 RETURNING id', [request.params.id]);
    if (result.rowCount === 0) return response.status(404).json({ error: 'Record not found.' });
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
