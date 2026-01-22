
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Sequelize, DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, Op } from 'sequelize';

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

// Declare sequelize at the top level
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
  declare userId: string; // Foreign Key
  declare name: string;
  declare type: 'focus' | 'meeting' | 'break' | 'other';
}

class TimeBlock extends Model<InferAttributes<TimeBlock>, InferCreationAttributes<TimeBlock>> {
  declare id: CreationOptional<string>;
  declare userId: string; // Foreign Key
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
        userId: { type: DataTypes.UUID, allowNull: false }, // Link to User
        name: { type: DataTypes.STRING, allowNull: false }, // Removed unique: true (names can duplicate across users)
        type: { type: DataTypes.ENUM('focus', 'meeting', 'break', 'other'), allowNull: false },
    }, { sequelize: seq, modelName: 'Category' });

    (TimeBlock as any).init({
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        userId: { type: DataTypes.UUID, allowNull: false }, // Link to User
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

// --- SEEDER HELPER ---
const seedDefaultCategoriesForUser = async (userId: string) => {
    console.log(`[SEED] Creating default categories for user ${userId}`);
    try {
        await (Category as any).bulkCreate([
            { userId, name: 'Development', type: 'focus' },
            { userId, name: 'Collaboration', type: 'meeting' },
        ], { ignoreDuplicates: true });
    } catch (e: any) {
        console.warn(`[SEED] Category seeding warning: ${e.message}`);
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
        
        // Seed default categories for this new user
        await seedDefaultCategoriesForUser(user.id);
        
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

app.post('/api/auth/change-password', verifyToken, async (req, res) => {
    const userId = (req as any).user.id;
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Missing fields' });
    }

    try {
        const user = await (User as any).findByPk(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const valid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!valid) return res.status(400).json({ error: 'Incorrect current password' });

        const salt = await bcrypt.genSalt(10);
        user.passwordHash = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

app.delete('/api/auth/account', verifyToken, async (req, res) => {
    const userId = (req as any).user.id;
    try {
        // Cascade delete (simulated manually for SQLite safety/consistency across DBs)
        await (TimeBlock as any).destroy({ where: { userId } });
        await (Category as any).destroy({ where: { userId } });
        await (User as any).destroy({ where: { id: userId } });
        
        res.clearCookie('token');
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete account' });
    }
});

// --- DATA ROUTES (SCOPED TO USER) ---

app.get('/api/categories', verifyToken, async (req, res) => {
    const userId = (req as any).user.id;
    const cats = await (Category as any).findAll({ where: { userId } });
    res.json(cats);
});

app.post('/api/categories', verifyToken, async (req, res) => {
    try {
        const userId = (req as any).user.id;
        const cat = await (Category as any).create({ ...req.body, userId });
        res.json(cat);
    } catch (e) { res.status(400).json({ error: 'Failed to create category' }); }
});

app.delete('/api/categories/:id', verifyToken, async (req, res) => {
    const userId = (req as any).user.id;
    // Only delete if it belongs to the user
    const deleted = await (Category as any).destroy({ where: { id: req.params.id, userId } });
    if (deleted) res.json({ success: true });
    else res.status(404).json({ error: 'Category not found or access denied' });
});

app.get('/api/blocks', verifyToken, async (req, res) => {
    const userId = (req as any).user.id;
    const { type, date, startDate, endDate } = req.query;
    
    const where: any = { userId, isPlanned: type === 'planned' };
    
    // Priority: Range > Specific Date > All
    if (startDate && endDate) {
        where.date = { [Op.between]: [startDate, endDate] };
    } else if (date) {
        where.date = date;
    }
    
    const blocks = await (TimeBlock as any).findAll({ where, order: [['date', 'ASC'], ['startTime', 'ASC']] });
    res.json(blocks);
});

app.post('/api/blocks', verifyToken, async (req, res) => {
    try {
        const userId = (req as any).user.id;
        const date = req.body.date || new Date().toISOString().split('T')[0];
        const block = await (TimeBlock as any).create({ ...req.body, userId, date });
        res.json(block);
    } catch (e) { res.status(400).json({ error: 'Failed to create block' }); }
});

app.put('/api/blocks/:id', verifyToken, async (req, res) => {
    const userId = (req as any).user.id;
    const [updated] = await (TimeBlock as any).update(req.body, { where: { id: req.params.id, userId } });
    if (updated) res.json({ success: true });
    else res.status(404).json({ error: 'Block not found or access denied' });
});

app.delete('/api/blocks/:id', verifyToken, async (req, res) => {
    const userId = (req as any).user.id;
    const deleted = await (TimeBlock as any).destroy({ where: { id: req.params.id, userId } });
    if (deleted) res.json({ success: true });
    else res.status(404).json({ error: 'Block not found or access denied' });
});

app.get('/api/history', verifyToken, async (req, res) => {
    const userId = (req as any).user.id;
    try {
        const blocks = await (TimeBlock as any).findAll({
            // Include focus, meeting, and other (exclude breaks implicitly by listing productive types)
            where: { userId, isPlanned: false, type: ['focus', 'meeting', 'other'] },
            attributes: ['date', [sequelize.fn('SUM', sequelize.col('durationMinutes')), 'totalMinutes']],
            group: ['date'],
            raw: true
        });
        res.json(blocks);
    } catch (e) { res.status(500).json({ error: 'Failed to fetch history' }); }
});

app.post('/api/reset', verifyToken, async (req, res) => {
    const userId = (req as any).user.id;
    console.log(`[RESET] Clearing data for user ${userId}`);
    try {
        // Only delete data for THIS user
        await (TimeBlock as any).destroy({ where: { userId } });
        await (Category as any).destroy({ where: { userId } });
        
        // Re-seed defaults for this user so the UI isn't empty
        await seedDefaultCategoriesForUser(userId);
        
        res.json({ success: true });
    } catch (e: any) {
        console.error("Reset failed", e);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/seed', verifyToken, async (req, res) => {
    const userId = (req as any).user.id;
    
    // Use provided date or default to UTC today (which might be tomorrow in some timezones)
    const date = req.body.date || new Date().toISOString().split('T')[0];
    
    console.log(`[SEED] Seeding data for user ${userId} on date ${date}`);

    try {
        // 1. Ensure Categories exist
        const catCount = await (Category as any).count({ where: { userId } });
        if (catCount === 0) {
            await seedDefaultCategoriesForUser(userId);
        }

        // 2. Fetch ANY suitable categories to link blocks to
        const allCats = await (Category as any).findAll({ where: { userId } });
        
        if (!allCats || allCats.length === 0) {
             throw new Error("Categories could not be created/found.");
        }

        // Robust selection: Find focus/meeting/break, or fallback to first available
        const focusCat = allCats.find((c: any) => c.type === 'focus') || allCats[0];
        const meetingCat = allCats.find((c: any) => c.type === 'meeting') || allCats.find((c: any) => c.type === 'focus') || allCats[0];
        const breakCat = allCats.find((c: any) => c.type === 'break') || allCats[0];

        await (TimeBlock as any).bulkCreate([
            { userId, title: 'Deep Work', app: 'VS Code', date, startTime: '09:00', endTime: '11:00', durationMinutes: 120, type: focusCat.type, categoryId: focusCat.id, isPlanned: true },
            { userId, title: 'Team Sync', app: 'Slack', date, startTime: '11:00', endTime: '11:30', durationMinutes: 30, type: meetingCat.type, categoryId: meetingCat.id, isPlanned: true },
            { userId, title: 'Project Review', app: 'Linear', date, startTime: '13:00', endTime: '14:00', durationMinutes: 60, type: focusCat.type, categoryId: focusCat.id, isPlanned: false },
            { userId, title: 'Lunch', app: 'Life', date, startTime: '12:00', endTime: '12:45', durationMinutes: 45, type: 'break', categoryId: breakCat?.id || null, isPlanned: true }
        ]);
        
        res.json({ success: true, message: "Seeded data successfully" });

    } catch (e: any) {
        console.error("Seed failed", e);
        res.status(500).json({ error: e.message });
    }
});

// --- SERVER STARTUP ---

const start = async () => {
    try {
        let connected = false;

        // 1. Attempt MySQL only if specified explicitly
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
                console.warn(`⚠️ MySQL Failed: ${err.message}. Falling back to SQLite if possible...`);
            }
        }

        // 2. Fallback or Default to SQLite
        if (!connected) {
            console.log(`Using SQLite (${DB_STORAGE}) with WAL mode enabled...`);
            sequelize = new Sequelize({
                dialect: 'sqlite',
                storage: DB_STORAGE,
                logging: false,
                // OPTIMIZATION: Use WAL mode for better concurrency and performance
                dialectOptions: {
                    mode: 2 // SQLITE_OPEN_READWRITE
                }
            });
            await sequelize.authenticate();
            // Enable Write-Ahead Logging for performance and robustness
            await sequelize.query("PRAGMA journal_mode=WAL;");
            await sequelize.query("PRAGMA synchronous=NORMAL;");
            
            console.log('✅ Connected to SQLite (WAL Mode)');
        }

        // 3. Init Models & Sync
        initModels(sequelize);
        
        try {
            await sequelize.sync({ alter: true });
        } catch (e) {
            console.warn("Sync alter failed, trying force/simple sync...");
            await sequelize.sync();
        }

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });

    } catch (error) {
        console.error('FATAL: Server failed to start', error);
        (process as any).exit(1);
    }
};

start();
