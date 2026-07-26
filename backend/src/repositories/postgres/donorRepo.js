import { v4 as uuid } from 'uuid';
import { q, tx } from '../../config/db.js';
import { rowToObject } from './_mapper.js';
import { logAudit } from './_audit.js';

const COLS = `id, name, mobile, pan, aadhaar, voter_id, passport, address, documents,
              created_at, updated_at, is_status`;

function decodeRow(row) {
  if (!row) return null;
  const obj = rowToObject(row);
  obj.documents = Array.isArray(obj.documents) ? obj.documents : (obj.documents || []);
  return obj;
}

async function loadTrustIds(client, donorId) {
  const r = await client.query(
    `SELECT dt.trust_id
       FROM donor_trusts dt
       JOIN trusts t ON dt.trust_id = t.id
      WHERE dt.donor_id = $1 AND t.deleted_at IS NULL AND t.is_status = 1
      ORDER BY dt.trust_id`,
    [donorId]
  );
  return r.rows.map((row) => row.trust_id);
}

async function replaceTrustIds(client, donorId, trustIds) {
  await client.query(`DELETE FROM donor_trusts WHERE donor_id = $1`, [donorId]);
  if (!trustIds || trustIds.length === 0) return;
  const values = trustIds.map((_, i) => `($1, $${i + 2})`).join(', ');
  await client.query(
    `INSERT INTO donor_trusts (donor_id, trust_id) VALUES ${values}`,
    [donorId, ...trustIds]
  );
}

async function decorate(row, client) {
  if (!row) return null;
  const obj = decodeRow(row);
  const runner = client
    ? (sql, params) => client.query(sql, params)
    : (sql, params) => q(sql, params);
  const r = await runner(
    `SELECT dt.trust_id
       FROM donor_trusts dt
       JOIN trusts t ON dt.trust_id = t.id
      WHERE dt.donor_id = $1 AND t.deleted_at IS NULL AND t.is_status = 1
      ORDER BY dt.trust_id`,
    [obj.id]
  );
  obj.trustIds = r.rows.map((tr) => tr.trust_id);
  return obj;
}

// Build a WHERE-fragment restricting donors to those linked to any of
// `trustIds`. Returns { clause, params, nextIndex } for splicing into a bigger
// query. If trustIds is null (admin), returns no restriction. If empty array,
// forces zero rows (user has access to nothing).
function trustScopeClause(trustIds, startIndex) {
  if (trustIds === null || trustIds === undefined) {
    return { clause: '', params: [], nextIndex: startIndex };
  }
  if (trustIds.length === 0) {
    return { clause: ' AND FALSE', params: [], nextIndex: startIndex };
  }
  return {
    clause: ` AND EXISTS (
      SELECT 1 FROM donor_trusts dt
      WHERE dt.donor_id = d.id AND dt.trust_id = ANY($${startIndex}::uuid[])
    )`,
    params: [trustIds],
    nextIndex: startIndex + 1,
  };
}

export const donorRepo = {
  async findAll(opts = {}) {
    const scope = trustScopeClause(opts.trustIds, 1);
    const trustFilter = opts.trustId
      ? ` AND EXISTS (SELECT 1 FROM donor_trusts dt WHERE dt.donor_id = d.id AND dt.trust_id = $${scope.nextIndex})`
      : '';
    const params = [...scope.params];
    if (opts.trustId) params.push(opts.trustId);
    const r = await q(
      `SELECT ${COLS} FROM donors d
        WHERE d.deleted_at IS NULL AND d.is_status = 1
        ${scope.clause}${trustFilter}
        ORDER BY lower(d.name)`,
      params
    );
    return Promise.all(r.rows.map((row) => decorate(row)));
  },
  async findById(id, opts = {}) {
    const scope = trustScopeClause(opts.trustIds, 2);
    const r = await q(
      `SELECT ${COLS} FROM donors d
        WHERE d.id = $1 AND d.deleted_at IS NULL AND d.is_status = 1
        ${scope.clause}`,
      [id, ...scope.params]
    );
    if (!r.rows[0]) return null;
    return decorate(r.rows[0]);
  },
  async search(term, opts = {}) {
    const scope = trustScopeClause(opts.trustIds, 1);
    const trustFilter = opts.trustId
      ? ` AND EXISTS (SELECT 1 FROM donor_trusts dt WHERE dt.donor_id = d.id AND dt.trust_id = $${scope.nextIndex})`
      : '';
    const searchParamIdx = scope.nextIndex + (opts.trustId ? 1 : 0);
    if (!term) {
      const params = [...scope.params];
      if (opts.trustId) params.push(opts.trustId);
      const r = await q(
        `SELECT ${COLS} FROM donors d
          WHERE d.deleted_at IS NULL AND d.is_status = 1
          ${scope.clause}${trustFilter}
          ORDER BY lower(d.name)`,
        params
      );
      return Promise.all(r.rows.map((row) => decorate(row)));
    }
    const t = `%${term.toLowerCase()}%`;
    const params = [...scope.params];
    if (opts.trustId) params.push(opts.trustId);
    params.push(t);
    const r = await q(
      `SELECT ${COLS} FROM donors d
        WHERE d.deleted_at IS NULL AND d.is_status = 1
        ${scope.clause}${trustFilter}
        AND (lower(d.name)                LIKE $${searchParamIdx}
          OR d.mobile                     LIKE $${searchParamIdx}
          OR lower(coalesce(d.pan,''))     LIKE $${searchParamIdx}
          OR coalesce(d.aadhaar,'')        LIKE $${searchParamIdx}
          OR lower(coalesce(d.voter_id,'')) LIKE $${searchParamIdx}
          OR lower(coalesce(d.passport,'')) LIKE $${searchParamIdx}
          OR lower(coalesce(d.address,''))  LIKE $${searchParamIdx})
        ORDER BY lower(d.name)`,
      params
    );
    return Promise.all(r.rows.map((row) => decorate(row)));
  },
  async create(data) {
    const id = uuid();
    return tx(async (c) => {
      const r = await c.query(
        `INSERT INTO donors (id, name, mobile, pan, aadhaar, voter_id, passport, address, documents)
         VALUES ($1,$2,$3,NULLIF($4,''),NULLIF($5,''),NULLIF($6,''),NULLIF($7,''),$8,$9::jsonb)
         RETURNING ${COLS}`,
        [
          id, data.name, data.mobile, data.pan || '', data.aadhaar || '', data.voterId || '',
          data.passport || '', data.address || '', JSON.stringify(data.documents || []),
        ]
      );
      await replaceTrustIds(c, id, data.trustIds || []);
      const after = await decorate(r.rows[0], c);
      await logAudit(c, { table: 'donors', recordId: id, action: 'create', after });
      return after;
    });
  },
  async update(id, patch) {
    return tx(async (c) => {
      const cur = await c.query(`SELECT ${COLS} FROM donors WHERE id = $1`, [id]);
      const beforeRow = cur.rows[0];
      if (!beforeRow) return null;
      const beforeTrustIds = await loadTrustIds(c, id);
      const before = { ...decodeRow(beforeRow), trustIds: beforeTrustIds };
      const r = await c.query(
        `UPDATE donors SET
            name = $2,
            mobile = $3,
            pan = NULLIF($4,''),
            aadhaar = NULLIF($5,''),
            voter_id = NULLIF($6,''),
            passport = NULLIF($7,''),
            address = $8,
            documents = $9::jsonb
         WHERE id = $1
         RETURNING ${COLS}`,
        [
          id,
          patch.name ?? before.name,
          patch.mobile ?? before.mobile,
          patch.pan ?? before.pan ?? '',
          patch.aadhaar ?? before.aadhaar ?? '',
          patch.voterId ?? before.voterId ?? '',
          patch.passport ?? before.passport ?? '',
          patch.address ?? before.address ?? '',
          JSON.stringify(patch.documents ?? before.documents ?? []),
        ]
      );
      if (patch.trustIds !== undefined) {
        await replaceTrustIds(c, id, patch.trustIds);
      }
      const after = await decorate(r.rows[0], c);
      await logAudit(c, { table: 'donors', recordId: id, action: 'update', before, after });
      return after;
    });
  },
  async remove(id) {
    return tx(async (c) => {
      const cur = await c.query(`SELECT ${COLS} FROM donors WHERE id = $1 AND deleted_at IS NULL AND is_status = 1`, [id]);
      const beforeRow = cur.rows[0];
      if (!beforeRow) return false;
      const beforeTrustIds = await loadTrustIds(c, id);
      const before = { ...decodeRow(beforeRow), trustIds: beforeTrustIds };
      await c.query(`UPDATE donors SET deleted_at = now(), is_status = 0 WHERE id = $1`, [id]);
      await logAudit(c, { table: 'donors', recordId: id, action: 'delete', before });
      return true;
    });
  },
  async appendDocument(id, doc) {
    return tx(async (c) => {
      const cur = await c.query(`SELECT ${COLS} FROM donors WHERE id = $1 AND deleted_at IS NULL AND is_status = 1 FOR UPDATE`, [id]);
      const beforeRow = cur.rows[0];
      if (!beforeRow) return null;
      const beforeTrustIds = await loadTrustIds(c, id);
      const before = { ...decodeRow(beforeRow), trustIds: beforeTrustIds };
      const documents = [...(before.documents || []), doc];
      const r = await c.query(
        `UPDATE donors SET documents = $2::jsonb WHERE id = $1 RETURNING ${COLS}`,
        [id, JSON.stringify(documents)]
      );
      const after = await decorate(r.rows[0], c);
      await logAudit(c, { table: 'donors', recordId: id, action: 'update', before, after });
      return after;
    });
  },
  async removeDocumentById(id, docId) {
    return tx(async (c) => {
      const cur = await c.query(`SELECT ${COLS} FROM donors WHERE id = $1 AND deleted_at IS NULL AND is_status = 1 FOR UPDATE`, [id]);
      const beforeRow = cur.rows[0];
      if (!beforeRow) return null;
      const beforeTrustIds = await loadTrustIds(c, id);
      const before = { ...decodeRow(beforeRow), trustIds: beforeTrustIds };
      const documents = (before.documents || []).filter((x) => x.id !== docId);
      const r = await c.query(
        `UPDATE donors SET documents = $2::jsonb WHERE id = $1 RETURNING ${COLS}`,
        [id, JSON.stringify(documents)]
      );
      const after = await decorate(r.rows[0], c);
      await logAudit(c, { table: 'donors', recordId: id, action: 'update', before, after });
      return after;
    });
  },
};
