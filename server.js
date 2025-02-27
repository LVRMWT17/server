import express from 'express';
import path from 'path';
import multer from "multer";
import dotenv from 'dotenv';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { createConnection } from 'mysql2';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = 5000;
dotenv.config();

app.use(cors());
app.use(express.json());

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'uploads');
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

const db = createConnection({
    host: 'localhost',
    user: 'ValLuc7',
    password: 'LeraLera7$',
    database: 'jsmysql'
});

db.connect(err => {
    if (err) {
        console.error('An error', err);
        return;
    }
    console.log('Successfully');
});

app.get('/api/forms/:formId/responses', (req, res) => {
    db.query('SELECT * FROM answers', (error, results) => {
        if (error) {
            return res.status(500).json({ error: 'Ошибка при получении данных' });
        }
        res.json(results);
    });
});

app.get('/api/users', (req, res) => {
    db.query('SELECT * FROM users2', (error, results) => {
        if (error) {
            return res.status(500).json({ error: 'Ошибка при получении данных' });
        }
        res.json(results);
    });
});
app.put('/api/users/:id/toggleAdmin', (req, res) => {
    const userId = req.params.id;
    const newAdminStatus = req.body.isAdmin;

    db.query('UPDATE users2 SET isAdmin = ? WHERE id = ?', [newAdminStatus, userId], (error, results) => {
        if (error) {
            console.error('Ошибка при обновлении статуса админа:', error);
            return res.status(500).json({ error: 'Ошибка при обновлении статуса админа' });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        res.json({ message: 'Статус админа обновлен' });
    });
});

app.post('/api/register', (req, res) => {
    const { email, password, firstName, lastName, registrationTime } = req.body;
    const checkQuery = 'SELECT * FROM users2 WHERE email = ?';
    db.execute(checkQuery, [email], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Error. Try again.' });
        }
        if (results.length > 0) {
            return res.status(400).json({ message: 'A user with such email already exists.' });
        }
    const query = 'INSERT INTO users2 (email, password, first_name, last_name, last_visit) VALUES (?, ?, ?, ?, ?)';
    db.execute(query, [email, password, firstName, lastName, registrationTime], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'An error during registration. Try again.' });
        }
        const userId = results.insertId;
        res.json({message: 'Successfully', id: userId})
    });
});
});

app.post('/api/creation', (req, res) => {
    const { user_id, form_title, form_description, image_url, tags, theme } = req.body;
    const query = 'INSERT INTO forms (author_id, form_title, form_description, image_url, tags, theme) VALUES (?, ?, ?, ?, ?, ?)';
    db.execute(query, [user_id, form_title, form_description, image_url, JSON.stringify(tags), theme], (err, results) => {
        if (err) {
            console.error('Ошибка при сохранении данных формы:', err);
            return res.status(500).json({ message: 'Ошибка сервера' });
        }
        res.status(201).json({ message: 'Форма успешно создана', id: results.insertId });
    });
});

app.get('/users/:id', (req, res) => {
    const userId = parseInt(req.params.id, 10);
    const query = 'SELECT * FROM users2 WHERE id = ?'; 

    db.execute(query, [userId], (err, results) => {
        if (err) {
            console.error('Ошибка при выполнении запроса: ', err);
            return res.status(500).json({ message: 'Ошибка сервера' });
        }

        if (results.length > 0) {
            return res.json(results[0]); 
        } else {
            return res.status(404).json({ message: 'Пользователь не найден' }); 
        }
    });
});
app.put('/users/:id', async (req, res) => {
    const { id } = req.params;
    const { first_name, last_name, password, email } = req.body;

    db.query(
        'UPDATE users2 SET first_name = ?, last_name = ?, password = ?, email = ? WHERE id = ?',
        [first_name, last_name, password, email, id],
        (err, results) => {
            if (err) {
                console.error('Ошибка при обновлении пользователя: ', err);
                return res.status(500).json({ message: 'Ошибка сервера' });
            }

            if (results.affectedRows > 0) {
                return res.json({ message: 'Успешно обновлено' });
            } else {
                return res.status(404).json({ message: 'Пользователь не найден' });
            }
        }
    );
});

app.post('/api/login', (req, res) => {
    const { email, password, id } = req.body;
    db.query('SELECT * FROM users2 WHERE email = ?', [email], (error, results) => {
        if (error) {
            return res.status(500).json({ message: 'Server error.' });
        }
        if (results.length === 0) {
            return res.status(401).json({ message: 'No such user.' });
        }
        const user = results[0];
    
        if (1 !== user.is_active) {
            return res.status(403).json({ message: 'Access denied. Your account is blocked.' });
        }
        if (password !== user.password) {
            return res.status(401).json({ message: 'Wrong password. Please, try again.' });
        }

        const registrationTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const updateQuery = 'UPDATE users2 SET last_visit = ? WHERE email = ?';
        db.execute(updateQuery, [registrationTime, email], (err, results) => {
            if (err) {
                console.error('An error', err);
                return res.status(500).json({ message: 'Authentication failed.' });
            }

            res.json({
                message: 'Successfully',
                user: {
                    id: user.id,
                    email: user.email,
                    isAdmin: user.isAdmin,
                },
            });
        });
    });
});    

app.get('/api/forms/:id', (req, res) => {
    const userId = req.params.id;

    db.query('SELECT * FROM forms WHERE author_id = ?', [userId], (error, results) => {
        if (error) {
            console.error('Error fetching forms:', error);
            return res.status(500).json({ message: 'Ошибка при загрузке форм' });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'Формы не найдены' });
        }

        res.json(results);
    });
});

app.get('/api/forms/:id', (req, res) => {
    const userId = req.params.id;

    db.query('SELECT * FROM forms WHERE author_id = ?', [userId], (error, results) => {
        if (error) {
            console.error('Error fetching forms:', error);
            return res.status(500).json({ message: 'Ошибка при загрузке форм' });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'Формы не найдены' });
        }

        res.json(results);
    });
});

app.get('/api/forms', (req, res) => {
    const userId = req.query.userId
    const query = `
        SELECT f.id, f.form_title, f.image_url, f.is_public, 
            GROUP_CONCAT(u.user_id) AS allowedUsers
        FROM forms f
        LEFT JOIN form_users u ON f.id = u.form_id
        GROUP BY f.id
    `;

    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Ошибка при выполнении запроса:', err);
            return res.status(500).json({ error: 'Ошибка при получении форм' });
        }
        const forms = results.map(form => ({
            id: form.id,
            form_title: form.form_title,
            image_url: form.image_url,
            is_public: form.is_public === 1 
        }));
        res.json(forms);
    });
});

app.get('/api/tags', (req, res) => {
    db.query('SELECT * FROM tags', (err, results) => {
        if (err) {
            console.error('Ошибка при запросе к базе данных:', err);
            return res.status(500).json({ error: 'Ошибка сервера' });
        }
        res.json(results);
    });
});

app.post('/api/tags', (req, res) => {
    const { name } = req.body;
    db.query('INSERT INTO tags (name) VALUES (?)', [name], (err, results) => {
        if (err) return res.status(500).json(err);
        res.status(201).json({ id: results.insertId, name });
    });
});

app.post('/api/form_users', (req, res) => {
    const { formId, userIds } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0) {
        const sql = 'INSERT INTO form_users (form_id, user_id) VALUES (?, ?)';
        db.query(sql, [formId, null], (err, results) => {
            if (err) {
                console.error('Ошибка при вставке данных:', err);
                return res.status(500).json({ error: 'Ошибка при вставке данных' });
            }
            return res.status(201).json({ formId, userIds: [null] });
        });
    } else {

        const values = userIds.map(userId => [formId, userId]);

        const sql = 'INSERT INTO form_users (form_id, user_id) VALUES ?';
        db.query(sql, [values], (err, results) => {
            if (err) {
                console.error('Ошибка при вставке данных:', err);
                return res.status(500).json({ error: 'Ошибка при вставке данных' });
            }
            res.status(201).json({ formId, userIds });
        });
    }
});

app.get('/api/getUserAccess', (req, res) => {
    db.query('SELECT * FROM form_users', (err, results) => {
        if (err) {
            console.error('Ошибка при запросе к базе данных:', err);
            return res.status(500).json({ error: 'Ошибка сервера' });
        }
        res.json(results);
    });
});

app.post('/api/edit-the-form/:id', async (req, res) => {
    const { id } = req.params;
    const { title, description, image, is_public, tags, theme, questions, selectedUsers } = req.body;
    if (!title || !description || typeof image !== 'string' || 
        typeof is_public !== 'boolean' || 
        !Array.isArray(tags) || !tags.every(tag => typeof tag === 'string') || 
        !Array.isArray(questions)) {
        return res.status(400).json({ message: 'Некорректные данные' });
    }

    try {
        await db.execute('DELETE FROM answers WHERE question_id IN (SELECT id FROM questions WHERE form_id = ?)', [id]);
        await db.execute('DELETE FROM questions WHERE form_id = ?', [id]);
        await db.execute(
            'UPDATE forms SET form_title = ?, form_description = ?, image_url = ?, is_public = ?, tags = ?, theme = ? WHERE id = ?',
            [title, description, image, is_public, JSON.stringify(tags), theme, id]
        );

        const questionInsertPromises = questions.map(question => {
            return db.execute(
                'INSERT INTO questions (form_id, question_title, question_type, options) VALUES (?, ?, ?, ?)',
                [id, question.question_title, question.question_type, question.options]
            );
        });
        await Promise.all(questionInsertPromises);
        if (selectedUsers.length > 0) {
            const userInsertPromises = selectedUsers.map(user => {
                return db.execute(
                    'INSERT INTO form_users (form_id, user_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE user_id = ?',
                    [id, user.id, user.id]
                );
            });
            await Promise.all(userInsertPromises);
        }

        res.status(200).json({ message: 'Форма успешно обновлена!' });
    } catch (error) {
        console.error('Ошибка при обновлении формы:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

app.get('/api/emails', (req, res) => {
    const search = req.query.search || '';
    const query = 'SELECT id, first_name, last_name, email FROM users2 WHERE email LIKE ?';

    db.query(query, [`${search}%`], (err, results) => {
        if (err) {
            console.error('Ошибка при запросе к базе данных:', err);
            return res.status(500).json({ error: 'Ошибка сервера' });
        }

        const users = results.map(user => ({
            id: user.id,
            fullName: `${user.first_name} ${user.last_name} (${user.email})`,
            email: user.email
        }));
        res.json(users);
    });
});
app.get('/api/formDetails/:id', (req, res) => {
    const formId = req.params.id;
    const query = `
        SELECT forms.*, form_users.user_id, form_users.user_id
        FROM forms
        LEFT JOIN form_users ON forms.id = form_users.form_id
        WHERE forms.id = ?
    `;

    db.query(query, [formId], (err, results) => {
        if (err) {
            console.error('Ошибка при запросе к базе данных:', err);
            return res.status(500).json({ error: 'Ошибка сервера' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Форма не найдена' });
        }

        const formDetails = {
            ...results[0],
            users: results.map(result => ({
                user_id: results[0].user_id || null,
                form_id: result.form_id,
            })).filter(user => user.user_id !== null)
        };

        res.json(formDetails);
    });
});

app.get('/api/questions', (req, res) => {
    const formId = req.query.formId;
    db.query('SELECT * FROM questions WHERE form_id = ?', [formId], (err, results) => {
        if (err) {
            console.error('Ошибка при запросе к базе данных:', err);
            return res.status(500).json({ error: 'Ошибка сервера' });
        }
        res.json(results);
    });
});

app.get('/api/EditForm/:id', (req, res) => {
    const formId = req.params.id;
    const getFormPromise = new Promise((resolve, reject) => {
        db.query('SELECT * FROM forms WHERE id = ?', [formId], (err, results) => {
            if (err) {
                console.error('Ошибка при запросе к базе данных:', err);
                return reject({ status: 500, error: 'Ошибка сервера' });
            }
            if (results.length === 0) {
                return reject({ status: 404, error: 'Форма не найдена' });
            }
            resolve(results[0]);
        });
    });

    const getQuestionsPromise = new Promise((resolve, reject) => {
        db.query('SELECT * FROM questions WHERE form_id = ?', [formId], (err, results) => {
            if (err) {
                console.error('Ошибка при запросе к базе данных:', err);
                return reject({ status: 500, error: 'Ошибка сервера' });
            }
            resolve(results);
        });
    });
    Promise.all([getFormPromise, getQuestionsPromise])
        .then(([form, questions]) => {
            res.json({ form, questions });
        })
        .catch((error) => {
            res.status(error.status).json({ error: error.error });
        });
});

app.post('/api/answers', (req, res) => {
    const answers = req.body;
    const insertPromises = answers.map(answer => {
        return new Promise((resolve, reject) => {
            db.query(
                'INSERT INTO answers (user_id, question_id, response) VALUES (?, ?, ?)',
                [answer.user_id, answer.question_id, answer.response],
                (error, results) => {
                    if (error) {
                        return reject(error);
                    }
                    resolve(results);
                }
            );
        });
    });

    Promise.all(insertPromises)
        .then(() => {
            res.status(201).json({ message: 'Ответы успешно сохранены' });
        })
        .catch(error => {
            console.error('Ошибка при сохранении ответов:', error);
            res.status(500).json({ message: 'Ошибка сервера' });
        });
});

app.post('/api/questions', (req, res) => {
    const { form_id, question_title, question_type, options } = req.body;
    const query = 'INSERT INTO questions (form_id, question_title, question_type, options) VALUES (?, ?, ?, ?)';
    const values = [form_id, question_title, question_type, JSON.stringify([options])];

    db.query(query, values, (err, results) => {
        if (err) {
            console.error('Ошибка при сохранении вопроса:', err);
            return res.status(500).json({ message: 'Ошибка сервера' });
        }
        res.status(201).json({ message: 'Вопрос успешно добавлен' });
    });
});

app.listen(PORT, () => { console.log(`Сервер запущен на http://localhost:${PORT}`);
})