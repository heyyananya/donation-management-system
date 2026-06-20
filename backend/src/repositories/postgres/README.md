# Postgres repository stubs

This folder is reserved for future Postgres implementations of the repository
interfaces defined in `../json/*.js`. Each repo must export the same surface:

- `donorRepo`: findAll, findById, search, create, update, remove
- `trustRepo`: findAll, findById, create, update, remove
- `remarkRepo`: findAll, findById, create, update, remove
- `receiptRepo`: findAll(filters), findById, findMaxNumber(fy, trustId), create,
  update, remove, countAll, recent
- `yearRepo`: findAll, findById, findByName, create, update, remove
- `userRepo`: findAll, findById, findByUsername, create, update, remove

When you implement these, wire them up in `../index.js` under
`drivers.postgres` and set `REPO_DRIVER=postgres` in `.env`.
