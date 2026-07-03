const { pool } = require('../config/db');

async function listFaculties(req, res, next) {
  try {
    const [rows] = await pool.query('SELECT * FROM faculties ORDER BY name');
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
}

async function createFaculty(req, res, next) {
  try {
    const { name } = req.body;
    const [result] = await pool.query('INSERT INTO faculties (name) VALUES (?)', [name]);
    res.status(201).json({ success: true, data: { id: result.insertId, name } });
  } catch (err) { next(err); }
}

async function listDepartments(req, res, next) {
  try {
    const { facultyId } = req.query;
    const params = [];
    let sql = `SELECT d.*, f.name AS faculty_name FROM departments d JOIN faculties f ON f.id = d.faculty_id`;
    if (facultyId) { sql += ' WHERE d.faculty_id = ?'; params.push(facultyId); }
    sql += ' ORDER BY d.name';
    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
}

async function createDepartment(req, res, next) {
  try {
    const { name, facultyId } = req.body;
    const [result] = await pool.query('INSERT INTO departments (faculty_id, name) VALUES (?, ?)', [facultyId, name]);
    res.status(201).json({ success: true, data: { id: result.insertId, name, facultyId } });
  } catch (err) { next(err); }
}

async function listProgrammes(req, res, next) {
  try {
    const { departmentId } = req.query;
    const params = [];
    let sql = `SELECT p.*, d.name AS department_name FROM programmes p JOIN departments d ON d.id = p.department_id`;
    if (departmentId) { sql += ' WHERE p.department_id = ?'; params.push(departmentId); }
    sql += ' ORDER BY p.name';
    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
}

async function createProgramme(req, res, next) {
  try {
    const { name, departmentId } = req.body;
    const [result] = await pool.query('INSERT INTO programmes (department_id, name) VALUES (?, ?)', [departmentId, name]);
    res.status(201).json({ success: true, data: { id: result.insertId, name, departmentId } });
  } catch (err) { next(err); }
}

module.exports = {
  listFaculties, createFaculty,
  listDepartments, createDepartment,
  listProgrammes, createProgramme,
};
