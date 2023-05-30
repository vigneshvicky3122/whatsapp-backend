const { MongoClient, ObjectId } = require("mongodb");
const Client = new MongoClient(process.env.DB_URL);
const Db = Client.db(process.env.DB_NAME);
const collection = [Db.collection(process.env.DB_COLLECTION_ONE),Db.collection(process.env.DB_COLLECTION_TWO)];

module.exports = { ObjectId, Client, collection };
