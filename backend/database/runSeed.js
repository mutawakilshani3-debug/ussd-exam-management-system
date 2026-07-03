/**
 * One-time seed script.
 * - Creates the base Faculty / Department / Programme structure (CKT-UTAS sample).
 * - Creates the single Administrator account from .env values.
 * - Safe to re-run: it will NOT create a second admin if one already exists.
 *
 * Usage: npm run seed
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

async function seedAcademicStructure() {
  const [faculties] = await pool.query('SELECT id FROM faculties LIMIT 1');
  if (faculties.length > 0) {
    console.log('Academic structure already seeded, skipping.');
    return;
  }

  const [facultyResult] = await pool.query(
    'INSERT INTO faculties (name) VALUES (?)',
    ['Faculty of Applied Sciences and Technology']
  );
  const facultyId = facultyResult.insertId;

  const [deptResult] = await pool.query(
    'INSERT INTO departments (faculty_id, name) VALUES (?, ?)',
    [facultyId, 'Department of Computer Science and Informatics']
  );
  const deptId = deptResult.insertId;

  await pool.query(
    'INSERT INTO programmes (department_id, name) VALUES (?, ?), (?, ?)',
    [deptId, 'Diploma in Information Technology', deptId, 'Diploma in Computer Science']
  );

  console.log('Academic structure (faculty/department/programmes) seeded.');
}

async function seedAdmin() {
  const [existingAdmins] = await pool.query(
    "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
  );

  if (existingAdmins.length > 0) {
    console.log('An Administrator account already exists. Skipping admin creation.');
    return;
  }

  const fullName = process.env.ADMIN_FULL_NAME || 'System Administrator';
  const email = process.env.ADMIN_EMAIL;
  const phone = process.env.ADMIN_PHONE;
  const rawPassword = process.env.ADMIN_PASSWORD;

  if (!email || !phone || !rawPassword) {
    console.error(
      'ADMIN_EMAIL, ADMIN_PHONE and ADMIN_PASSWORD must be set in .env before seeding.'
    );
    process.exit(1);
  }

  const hashed = await bcrypt.hash(rawPassword, 12);

  await pool.query(
    `INSERT INTO users (full_name, email, phone, password, role, is_verified, is_active)
     VALUES (?, ?, ?, ?, 'admin', 1, 1)`,
    [fullName, email, phone, hashed]
  );

  console.log('Administrator account created.');
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${rawPassword} (please change this after first login)`);
}

(async () => {
  try {
    await seedAcademicStructure();
    await seedAdmin();
    console.log('Seeding complete.');
  } catch (err) {
    console.error('Seeding failed:', err);
  } finally {
    await pool.end();
  }
})();
