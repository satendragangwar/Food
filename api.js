const express = require('express');
const NutritionEstimator = require('./src/index');
const DishClassifier = require('./src/DishClassifier');

// Initialize the app
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Create instance of NutritionEstimator with AI SDK
const nutritionEstimator = new NutritionEstimator();

// Routes
app.get('/', (req, res) => {
  res.json({
    name: 'Indian Dish Nutrition Estimator API',
    description: 'API for estimating nutritional values of Indian dishes using AI SDK with Google Gemini',
    usage: {
      endpoint: '/api/nutrition/:dishName',
      method: 'GET',
      description: 'Get nutritional information for a dish'
    }
  });
});

app.get('/api/nutrition/:dishName', async (req, res) => {
  try {
    const dishName = req.params.dishName;
    
    if (!dishName) {
      return res.status(400).json({
        error: true,
        message: 'Dish name is required'
      });
    }

    // Validate dish name format
    const dishClassifier = new DishClassifier();
    if (!dishClassifier.isValidDishName(dishName)) {
      return res.status(400).json({
        error: true,
        message: `Invalid dish name: "${dishName}". Name must be at least 3 characters long, contain at least one letter, and can only include letters, spaces, hyphens, and basic punctuation.`
      });
    }
    
    console.log(`API Request: Estimating nutrition for "${dishName}"`);
    const result = await nutritionEstimator.estimateNutrition(dishName);
    
    if (result.error) {
      return res.status(404).json(result);
    }
    
    res.json(result);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      error: true,
      message: `Server error: ${error.message}`
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`API endpoint: http://localhost:${port}/api/nutrition/:dishName`);
}); 