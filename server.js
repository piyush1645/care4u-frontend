
const { app } = require('./app.js');

const env = require('dotenv/config');

const port = process.env.PORT || 5151;

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
})