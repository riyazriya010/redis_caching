const express = require('express')
const rateLimit = require('express-rate-limit')
const cron = require('node-cron')

const app = express()

//task want to do in time based
cron.schedule("*/1 * * * *", () => {
    console.log('Runs Every 1 mins')
})

// limiting the request
const limitRequest = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 5,
    message: "Too many login attempts from this IP, please try again after 10 minutes.",
    standardHeaders: true,
    legacyHeaders: false,
})

app.use(limitRequest)

app.get('/', (req, res) => {
    res.send('Welcome to root page')
})

app.listen(4040, console.log('server started'))

