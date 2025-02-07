require('dotenv').config();

const express = require('express')
const session = require('express-session')
const passport = require('passport');
const cors = require('cors')
const checkAuth = require('./middleware/auth');

const port = 3000

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Configure session middleware
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));

const v1Routes = require('./routes/v1');
const authRoutes = require('./routes/auth');

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

app.use('/api/v1', checkAuth, v1Routes);
app.use('/', authRoutes);

app.get("/test-firebase", async (req, res) => {
    try {
        const users = await admin.auth().listUsers();
        res.json({ users });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


app.listen(port)
