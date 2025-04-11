// ./cofif/db.js
require('dotenv').config({ path: '../../gateway/.env' });
const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

let db;

async function connectToMongo() {
    try {
        await client.connect();
        db = client.db('BD_Gday');
        console.log('Conectado a MongoDB: BD_Gday');
    } catch (error) {
        console.error('Error conectando a MongoDB:', error);
        throw error;
    }
}

function getDb() {
    if (!db) {
        throw new Error('No conectado a la base de datos');
    }
    return db;
}

module.exports = { connectToMongo, getDb };
