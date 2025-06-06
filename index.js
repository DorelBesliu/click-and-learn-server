require('dotenv').config({ path: process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env' });

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

app.listen(port)
