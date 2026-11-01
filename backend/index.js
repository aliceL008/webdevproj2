// backend/index.js
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB (using local MongoDB or URI from .env)
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/evening-plan';
mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB successfully!'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define a Mongoose Schema and Model for Meals
const mealSchema = new mongoose.Schema({
  title: { type: String, required: true },
  prepTime: { type: String, required: true },
  calories: { type: Number, required: true }
});

const Meal = mongoose.model('Meal', mealSchema);

// Basic GET Route
app.get('/', (req, res) => {
  res.send('Evening Plan API is running with MongoDB!');
});

// GET all meals from MongoDB
app.get('/api/meals', async (req, res) => {
  try {
    const meals = await Meal.find();
    res.json(meals);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch meals' });
  }
});

// POST a new meal to MongoDB
app.post('/api/meals', async (req, res) => {
  try {
    const newMeal = new Meal({
      title: req.body.title,
      prepTime: req.body.prepTime,
      calories: req.body.calories
    });
    
    const savedMeal = await newMeal.save();
    res.status(201).json(savedMeal);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create meal' });
  }
});


// DELETE a meal by ID
app.delete('/api/meals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Meal.findByIdAndDelete(id);
    res.json({ message: 'Meal deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete meal' });
  }
});

// UPDATE a meal by ID
app.put('/api/meals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedMeal = await Meal.findByIdAndUpdate(
      id,
      {
        title: req.body.title,
        prepTime: req.body.prepTime,
        calories: req.body.calories
      },
      { new: true } // { new: true } returns the updated document instead of the old one
    );
    res.json(updatedMeal);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update meal' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});