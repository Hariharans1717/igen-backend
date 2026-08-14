const pool = require('./config/db');
pool.query('ALTER TABLE candidates ADD COLUMN IF NOT EXISTS key_skills TEXT[] DEFAULT \'{}\';')
  .then(() => {
    console.log('Done');
    process.exit(0);
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
