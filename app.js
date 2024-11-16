const express = require('express');
const cors = require('cors');
const redis = require('redis');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));

const DEFAULT_EXPIRATION = 3600;
const redisClient = redis.createClient({
    host: '127.0.0.1',  // Ensure this is the correct host
    port: 6379,         // Ensure this is the correct port
});

redisClient.connect()
    .then(() => {
        console.log('Redis client connected successfully');
    })
    .catch((err) => {
        console.error('Redis connection error:', err);
    });

redisClient.on('connect', () => {
    console.log('Redis client connected');
});

redisClient.on('ready', () => {
    console.log('Redis client is ready for operations');
});

redisClient.on('error', (err) => {
    console.error('Redis error:', err);
});

redisClient.on('end', () => {
    console.log('Redis client disconnected');
});

app.get('/', (req, res) => {
    res.send('Root Page');
});

app.get('/photos', async (req, res) => {
    const albumId = req.query.albumId;

    try {
        // Wait for Redis to be connected before making requests
        if (redisClient.isOpen) {
            // Fetch all photos from API
            const { data } = await axios.get('https://jsonplaceholder.typicode.com/photos', {
                params: { albumId },
            });

            // Iterate through each photo and store it in Redis with its unique id
            data.forEach(async (photo) => {
                await redisClient.setEx(`photos:${albumId}`, DEFAULT_EXPIRATION, JSON.stringify(photo));
            });

            res.json({ datas: data });
        } else {
            console.error('Redis client is not connected');
            res.status(500).json({ error: 'Redis client is closed or not connected' });
        }
    } catch (err) {
        console.error('Error fetching photos:', err);
        res.status(500).json({ error: 'Error fetching photos from API' });
    }
});

app.get('/photo', async (req, res) => {
    const id  = req.query.id;

    try {
        // Wait for Redis to be connected before making requests
        if (redisClient.isOpen) {
            console.log('Redis client is open');
            // Check Redis cache for the specific photo
            await redisClient.get(`photos:${id}`, async (err, photo) => {
                if (err) {
                    console.error('Error while getting from Redis', err);
                    return res.status(500).json({ error: 'Error fetching data from Redis' });
                }
                console.log('Redis GET result:', photo);
                // If photo exists in cache, return it
                if (photo !== null) {
                    console.log('Cache Hit');
                    return res.json(JSON.parse(photo));  // Ensure we are returning the JSON response here
                }

                // If photo is not in cache, fetch from the API
                console.log('Cache Miss');
                try {
                    const { data } = await axios.get(`https://jsonplaceholder.typicode.com/photos/${id}`);

                    // Store the specific photo in Redis
                    await redisClient.setEx(`photos:${id}`, DEFAULT_EXPIRATION, JSON.stringify(data));
                    return res.json(data);  // Send response once the data is fetched and cached
                } catch (err) {
                    console.error('Error fetching photo from API:', err);
                    return res.status(500).json({ error: 'Error fetching photo from API' });
                }
            });
        } else {
            console.error('Redis client is not connected');
            return res.status(500).json({ error: 'Redis client is closed or not connected' });
        }
    } catch (err) {
        console.error('Error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
