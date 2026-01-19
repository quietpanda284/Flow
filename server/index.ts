import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Sequelize, DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';

// --- CONFIGURATION ---
const PORT = 3006;
const DB_DIALECT = (process.env.DB_DIALECT as 'mysql' | 'sqlite') || 'sqlite';
const DB_STORAGE = process.env.DB_STORAGE || 'database.sqlite';
const DB_NAME = process.env.DB_NAME || 'flowstate';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASS = process.env.DB_PASS || '12345678';
const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'flowstate_secret_key_change_me';

const app = express();

// Declare sequelize at the top level to avoid hoisting/TDZ issues in route definitions
let sequelize: Sequelize;

// --- MIDDLEWARE ---
app.use((req, res, next) => {
    console.log(`[INCOMING] ${req.method} ${req.url}`);
    next();
});

app.use(cors({
    origin: true, 
    credentials: true
}) as any);
app.use(express.json() as any);
app.use(cookieParser() as any);

// --- MODELS ---
class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
    declare id: CreationOptional<string>;
    declare username: string;
    declare passwordHash: string;
}

class Category extends Model<InferAttributes<Category>, InferCreationAttributes<Category>> {
  declare id: CreationOptional<string>;
  declare name: string;
  declare type: 'focus' | 'meeting' | 'break' | 'other';
}

class TimeBlock extends Model<InferAttributes<TimeBlock>, InferCreationAttributes<TimeBlock>> {
  declare id: CreationOptional<string>;
  declare title: string;
  declare app: CreationOptional<string>;
  declare date: string;
  declare startTime: string;
  declare endTime: string;
  declare durationMinutes: number;
  declare type: string;
  declare categoryId: CreationOptional<string | null>;
  declare description: CreationOptional<string>;
  declare isPlanned: CreationOptional<boolean>;
}

const initModels = (seq: Sequelize) => {
    (User as any).init({
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        username: { type: DataTypes.STRING, allowNull: false, unique: true },
        passwordHash: { type: DataTypes.STRING, allowNull: false }
    }, { sequelize: seq, modelName: 'User' });

    (Category as any).init({
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        name: { type: DataTypes.STRING, allowNull: false, unique: true },
        type: { type: DataTypes.ENUM('focus', 'meeting', 'break', 'other'), allowNull: false },
    }, { sequelize: seq, modelName: 'Category' });

    (TimeBlock as any).init({
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        title: { type: DataTypes.STRING, allowNull: false },
        app: { type: DataTypes.STRING, allowNull: false, defaultValue: 'Manual' },
        date: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
        startTime: { type: DataTypes.STRING, allowNull: false },
        endTime: { type: DataTypes.STRING, allowNull: false },
        durationMinutes: { type: DataTypes.INTEGER, allowNull: false },
        type: { type: DataTypes.STRING, allowNull: false },
        categoryId: { type: DataTypes.STRING, allowNull: true },
        description: { type: DataTypes.TEXT, allowNull: true },
        isPlanned: { type: DataTypes.BOOLEAN, defaultValue: false },
    }, { sequelize: seq, modelName: 'TimeBlock' });
};

// --- AUTH MIDDLEWARE ---
const verifyToken = (req: any, res: any, next: any) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Access denied.' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (err) {
        res.status(400).json({ error: 'Invalid token' });
    }
};

// --- SEEDER ---
const seedData = async () => {
    try {
        const userCount = await (User as any).count();
        if (userCount === 0) {
            console.log('Seeding Admin User...');
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash('password123', salt);
            await (User as any).create({ username: 'admin', passwordHash: hash });
        }

        const catCount = await (Category as any).count();
        if (catCount === 0) {
            console.log('Seeding Categories...');
            const today = new Date().toISOString().split('T')[0];
            await (Category as any).bulkCreate([
                { id: 'cat_1', name: 'Development', type: 'focus' },
                { id: 'cat_2', name: 'Collaboration', type: 'meeting' },
                { id: 'cat_4', name: 'Breaks', type: 'break' },
                { id: 'cat_5', name: 'Admin', type: 'other' },
            ]);
            // Sample Blocks
            await (TimeBlock as any).bulkCreate([
                { title: 'Deep Work', app: 'VS Code', date: today, startTime: '09:00', endTime: '11:00', durationMinutes: 120, type: 'focus', categoryId: 'cat_1', isPlanned: true },
                { title: 'Standup', app: 'Zoom', date: today, startTime: '11:00', endTime: '11:30', durationMinutes: 30, type: 'meeting', categoryId: 'cat_2', isPlanned: true }
            ]);
        }
    } catch (err) {
        console.error("Seed error:", err);
    }
};

// --- ROUTES ---

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', dialect: (sequelize as any).getDialect() });
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await (User as any).findOne({ where: { username } });
        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }
        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
        res.cookie('token', token, { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 7 * 24 * 3600000 } as any);
        res.json({ success: true, user: { id: user.id, username: user.username } });
    } catch (err) {
        res.status(500).json({ error: 'Login failed' });
    }
});

app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
        
        const existing = await (User as any).findOne({ where: { username } });
        if (existing) return res.status(400).json({ error: 'Username taken' });

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        const user = await (User as any).create({ username, passwordHash });
        
        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
        res.cookie('token', token, { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 7 * 24 * 3600000 } as any);
        res.json({ success: true, user: { id: user.id, username: user.username } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Registration failed' });
    }
});

app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true });
});

app.get('/api/auth/me', verifyToken, async (req, res) => {
    try {
        const user = await (User as any).findByPk((req as any).user.id, { attributes: ['id', 'username'] });
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching user' });
    }
});

// Data Routes
app.get('/api/categories', verifyToken, async (req, res) => {
    const cats = await (Category as any).findAll();
    res.json(cats);
});

app.post('/api/categories', verifyToken, async (req, res) => {
    try {
        const cat = await (Category as any).create(req.body);
        res.json(cat);
    } catch (e) { res.status(400).json({ error: 'Failed to create category' }); }
});

app.delete('/api/categories/:id', verifyToken, async (req, res) => {
    await (Category as any).destroy({ where: { id: req.params.id } });
    res.json({ success: true });
});

app.get('/api/blocks', verifyToken, async (req, res) => {
    const { type, date } = req.query;
    const where: any = { isPlanned: type === 'planned' };
    if (date) where.date = date;
    const blocks = await (TimeBlock as any).findAll({ where, order: [['startTime', 'ASC']] });
    res.json(blocks);
});

app.post('/api/blocks', verifyToken, async (req, res) => {
    try {
        const date = req.body.date || new Date().toISOString().split('T')[0];
        const block = await (TimeBlock as any).create({ ...req.body, date });
        res.json(block);
    } catch (e) { res.status(400).json({ error: 'Failed to create block' }); }
});

app.put('/api/blocks/:id', verifyToken, async (req, res) => {
    await (TimeBlock as any).update(req.body, { where: { id: req.params.id } });
    res.json({ success: true });
});

app.delete('/api/blocks/:id', verifyToken, async (req, res) => {
    await (TimeBlock as any).destroy({ where: { id: req.params.id } });
    res.json({ success: true });
});

app.get('/api/history', verifyToken, async (req, res) => {
    try {
        const blocks = await (TimeBlock as any).findAll({
            where: { isPlanned: false, type: 'focus' },
            attributes: ['date', [sequelize.fn('SUM', sequelize.col('durationMinutes')), 'totalMinutes']],
            group: ['date'],
            raw: true
        });
        res.json(blocks);
    } catch (e) { res.status(500).json({ error: 'Failed to fetch history' }); }
});

app.post('/api/reset', verifyToken, async (req, res) => {
    await (TimeBlock as any).destroy({ where: {}, truncate: true });
    await (Category as any).destroy({ where: {}, truncate: true });
    res.json({ success: true });
});

app.post('/api/seed', verifyToken, async (req, res) => {
    await seedData();
    res.json({ success: true });
});

// --- SERVER STARTUP ---

const start = async () => {
    try {
        let connected = false;

        // 1. Try MySQL
        if (DB_DIALECT === 'mysql') {
            console.log(`Connecting to MySQL at ${DB_HOST}...`);
            try {
                const mysqlSeq = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
                    host: DB_HOST,
                    port: DB_PORT,
                    dialect: 'mysql',
                    logging: false,
                    dialectOptions: { connectTimeout: 5000 }
                });
                await mysqlSeq.authenticate();
                sequelize = mysqlSeq;
                connected = true;
                console.log('✅ Connected to MySQL');
            } catch (err: any) {
                console.warn(`⚠️ MySQL Failed: ${err.message}`);
            }
        }

        // 2. Fallback to SQLite
        if (!connected) {
            console.log(`Using SQLite fallback (${DB_STORAGE})...`);
            sequelize = new Sequelize({
                dialect: 'sqlite',
                storage: DB_STORAGE,
                logging: false
            });
            await sequelize.authenticate();
            console.log('✅ Connected to SQLite');
        }

        // 3. Init
        initModels(sequelize);
        
        try {
            await sequelize.sync({ alter: true });
        } catch (e) {
            console.warn("Sync alter failed, trying force/simple sync...");
            await sequelize.sync();
        }

        await seedData();

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });

    } catch (error) {
        console.error('FATAL: Server failed to start', error);
        process.exit(1);
    }
};

start();
