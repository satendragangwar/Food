# Food: Indian Dish Nutrition Estimator

A modern Node.js application that leverages AI to estimate nutritional values for Indian dishes based on their ingredients and standard serving sizes.

## 🌟 Overview

App solves the challenge of estimating nutritional values for home-cooked Indian dishes by:

1. Taking a dish name as input (e.g., "Paneer Butter Masala")
2. Using Google's Gemini AI to fetch a recipe with ingredients and quantities
3. Mapping ingredients to a comprehensive nutrition database (2000+ ingredients)
4. Converting quantities to grams using standard measurements
5. Calculating precise nutrition values
6. Providing nutrition per standard serving size (katori, piece, etc.)

## ✨ Key Features

- **AI-Powered Recipe Generation**: Uses Google Gemini via Vercel AI SDK to generate recipes
- **Comprehensive Nutrition Database**: Contains 2000+ ingredients with detailed nutritional information
- **Intelligent Ingredient Mapping**: Handles variants and synonyms in 4000+ ingredient names
- **Smart Quantity Conversion**: Standardizes Indian household measurements to grams
- **Dish Classification**: Automatically determines the type of dish
- **Cooking Instructions**: Generates step-by-step cooking instructions
- **Dual Interface**: Use via CLI or REST API

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone git@github.com:satendragangwar/Food.git
cd food

# Install dependencies
npm install

# Process the comprehensive nutrition database
node scripts/setup.js

# Create .env file (copy from below)
touch .env
```

Add the following to your `.env` file:

```
# Google Gemini API Key
GOOGLE_GENERATIVE_AI_API_KEY=your_google_api_key_here

# Server port (default: 3000)
PORT=3000
```

### Usage

#### CLI Interface

```bash
# Run the CLI tool
npm run cli

# Or try example dishes
npm run example:chana     # Chana Masala
npm run example:paneer    # Paneer Butter Masala
npm run example:biryani   # Chicken Biryani
```

Example CLI interaction:
```
Enter dish name: dal makhani

Analyzing "dal makhani"...

✅ Results:

Dish: Dal Makhani
Type: Dal
Serving Size: 1 katori (150g)

Nutrition per serving:
Calories: 220 kcal
Protein: 9.5g
Carbs: 24.2g
Fat: 8.3g
Fiber: 6.7g

Ingredients:
- urad dal: 1 cup
- rajma: 1/4 cup
- butter: 2 tablespoons
- tomato: 2 medium
- ...

Cooking Instructions:
1. Soak urad dal and rajma overnight...
```

#### API Server

```bash
# Start the API server
npm start
```

Access the API at:
- `http://localhost:3000/api/nutrition/{dishName}`

## 🧩 Architecture

App follows a modular architecture for better maintainability:

1. **Recipe Fetcher** (`recipeFetcher.js`): Uses Google Gemini to fetch recipes or falls back to dummy data
2. **Ingredient Mapper** (`ingredientMapper.js`): Maps ingredients to the comprehensive nutrition database
3. **Quantity Standardizer** (`quantityStandardizer.js`): Converts quantities to grams
4. **Nutrition Calculator** (`nutritionCalculator.js`): Calculates nutrition based on ingredients
5. **Dish Classifier** (`dishClassifier.js`): Identifies the dish type
6. **Error Handler** (`errorHandler.js`): Handles errors and edge cases

## 🛠️ AI Integration

App uses the Vercel AI SDK to integrate with Google's Gemini models, which provides:

- **Structured Output Generation**: Using Zod schemas for type-safe data
- **Natural Recipe Instructions**: Human-like cooking instructions
- **Consistent API**: Works with multiple AI providers

## 🔄 Error Handling

The application handles various edge cases:

- **Missing Recipe Data**: Falls back to generic recipes
- **Unknown Ingredients**: Uses fuzzy matching and synonyms
- **Quantity Conversion Issues**: Applies reasonable defaults
- **Extreme Nutrition Values**: Validates and caps unreasonable values
- **Unknown Dish Types**: Classifies based on ingredients or defaults to "Wet Sabzi"

## 📊 Nutrition Data Source

The nutrition database is processed from the "Assignment Inputs - Nutrition source.csv" file into a comprehensive processedNutritionDB.csv file, which contains detailed nutritional information for over 2000 food items.

## 📝 License

ISC

## Assumptions Made

*   Recipes fetched from the AI are assumed to be for a standard serving size of 3-4 people unless specified otherwise.
*   Water loss during cooking is generally ignored for simplicity in weight calculations.
*   When converting units like 'ml' to grams, a density of 1g/ml is assumed as a general approximation.
*   The nutrition database (`data/nutritionDB.json`) is the source of truth for ingredient nutritional values per 100g.
*   Standard serving sizes (e.g., 1 katori ≈ 180g for Wet Sabzi) are based on the mappings in `data/dishClassifications.json`.
*   Ingredient mapping uses fuzzy matching as a fallback, which might not always be perfectly accurate.

## Modularization Approach

The application is designed with a modular architecture, separating concerns into distinct services:

*   **`RecipeFetcher`**: Handles interaction with the AI (Google Gemini) to get the initial recipe data (ingredients, quantities, type).
*   **`IngredientMapper`**: Responsible for mapping ingredient names from the recipe to entries in the nutrition database, handling synonyms and variations.
*   **`QuantityStandardizer`**: Parses quantity strings (e.g., "1 cup", "2 tsp") and converts them into grams using predefined household measurement mappings and ingredient category data.
*   **`NutritionCalculator`**: Takes the mapped ingredients and standardized quantities (in grams) to calculate the total nutritional profile of the dish and extrapolate per-serving values.
*   **`DishClassifier`**: Determines the type of dish (e.g., Wet Sabzi, Dal) and helps determine the standard serving size.
*   **`NutritionEstimator` (`src/index.js`)**: The main orchestrator class that coordinates the workflow between these services.
*   **`ErrorHandler`**: A utility class to centralize validation logic (e.g., checking for outlier nutrition values) and format error/warning responses.

This separation makes the code easier to understand, maintain, and test.

## Input/Output Examples

Here are a few examples of how to use the application:

**Example 1: Paneer Butter Masala (API)**

*   **Request:** `GET /api/nutrition/paneer%20butter%20masala`
*   **Output (structure):**
    ```json
    {
      "dish_name": "Paneer Butter Masala",
      "dish_type": "Wet Sabzi",
      "estimated_nutrition_per_serving": {
        "calories": 280,
        "protein": 12,
        "carbs": 10,
        "fat": 18,
        "fiber": 2 
      },
      "serving_size": {
        "grams": 180,
        "household_measure": "1 katori"
      },
      "ingredients_used": [
        { "ingredient": "Paneer", "quantity": "1 cup cubes" },
        { "ingredient": "Butter", "quantity": "2 tablespoon" },
        { "ingredient": "Tomato Puree", "quantity": "1 cup" },
        { "ingredient": "Onion", "quantity": "1 medium chopped" },
        { "ingredient": "Cashew Paste", "quantity": "1/4 cup" },
        { "ingredient": "Cream", "quantity": "2 tablespoon" },
        { "ingredient": "Ginger Garlic Paste", "quantity": "1 tablespoon" },
        { "ingredient": "Spices (Garam Masala, etc.)", "quantity": "to taste" }
      ],
      "total_weight_g": 850,
      "cooking_instructions": "(Generated cooking steps)..."
    }
    ```

**Example 2: Chana Masala (CLI)**

*   **Command:** `npm run cli "Chana Masala"`
*   **Output (similar structure to above)**

**Example 3: Dal Makhani (CLI)**

*   **Command:** `npm run cli "Dal Makhani"`
*   **Output (similar structure to above)**

**Example 4: Aloo Gobi (CLI)**

*   **Command:** `npm run cli "Aloo Gobi"`
*   **Output (similar structure to above)**

**Example 5: Chicken Biryani (API)**

*   **Request:** `GET /api/nutrition/chicken%20biryani`
*   **Output (similar structure to above, likely classified as 'Rice' or 'Non-Veg Curry' depending on AI)**

*(Note: Actual nutritional values and ingredient lists/quantities will vary based on the AI's response and database mappings.)*

## Setup

1. Clone the repository: `git clone <repository-url>`
2. Navigate to the project directory: `cd food`
3. Install dependencies: `npm install`
4. Create a `.env` file in the root directory with your Google Gemini API key:
   ```dotenv
   GOOGLE_GENERATIVE_AI_API_KEY=your_google_api_key_here
   PORT=3000
   ```

## Usage

**CLI:**

*   Interactive mode: `npm run cli` (Prompts you to enter a dish name)
*   Direct mode: `npm run cli "<dish name>"` (e.g., `npm run cli "Palak Paneer"`)
*   Preset Examples:
    *   `npm run example:chana`
    *   `npm run example:paneer`
    *   `npm run example:biryani`
    *   `npm run example:samosa`
    *   `npm run example:dal`

**API:**

1.  Start the server: `npm start` (or `npm run dev` for development with hot-reloading)
2.  Send a GET request to: `http://localhost:3000/api/nutrition/:dishName`
    *   Example: `http://localhost:3000/api/nutrition/aloo%20gobi`

## Project Structure

```
/food
├── data/
│   ├── dishClassifications.json   # Dish types and serving sizes
│   ├── dummyRecipes.json          # Fallback recipes
│   ├── householdMeasurements.json # Unit conversions (cup->g, etc.)
│   └── nutritionDB.json           # Ingredient nutrition data
├── src/
│   ├── services/                # Core logic modules
│   │   ├── recipeFetcher.js
│   │   ├── ingredientMapper.js
│   │   ├── quantityStandardizer.js
│   │   ├── nutritionCalculator.js
│   │   └── dishClassifier.js
│   ├── utils/
│   │   └── errorHandler.js        # Error handling utilities
│   └── index.js                 # Main NutritionEstimator class
├── .env.example                 # Example environment file
├── api.js                       # Express API server implementation
├── cli.js                       # Command-line interface implementation
├── package.json
└── README.md
```

## Main Components

*   **`src/index.js`**: Main class `NutritionEstimator` that orchestrates the entire process.
*   **`api.js`**: REST API server implementation using Express.
*   **`cli.js`**: Command-line interface implementation using `inquirer` and `yargs`.

## Key Services

(Refer to Modularization Approach section above) 