"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = require("./models/db");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use(express_1.default.json());
// TODO: Import and use production routes here
// import offerRoutes from './routes/offer';
// app.use('/api/offer', offerRoutes);
const PORT = process.env.PORT || 4000;
// Test DB connection before starting server
(0, db_1.testConnection)().then(() => {
    app.listen(PORT, () => {
        console.log(`Chase the Bag Coin Exchange running on port ${PORT}`);
    });
});
