const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_BASE = 'https://api.balldontlie.io/v1/';
const API_KEY = '4a7b83cf-4698-43e6-b480-3ac157221c66';

app.get('/', (req, res) => {
    res.send('Backend работает!');
});

app.get('/api/daily-games', async (req, res) => {
    try {
        const dateStr = req.query.date
            ? String(req.query.date)
            : (() => {
                const tomorrow = new Date()
                tomorrow.setDate(tomorrow.getDate() + 1)
                return tomorrow.toISOString().slice(0, 10)
            })()

        const url = `${API_BASE}games?dates[]=${dateStr}`
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${API_KEY}` }
        })

        if (!response.ok) throw new Error(`API error! status: ${response.status}`)

        const data = await response.json()
        res.json(data.data || [])
    } catch (err) {
        console.error('Ошибка при запросе игр:', err)
        res.status(500).json({ error: 'Не удалось загрузить игры' })
    }
})

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});