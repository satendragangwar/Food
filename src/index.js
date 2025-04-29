require("dotenv").config();
const RecipeFetcher = require("./services/recipeFetcher");
const IngredientMapper = require("./services/ingredientMapper");
const QuantityStandardizer = require("./services/quantityStandardizer");
const NutritionCalculator = require("./services/nutritionCalculator");
const DishClassifier = require("./services/dishClassifier");
const ErrorHandler = require("./utils/errorHandler");
const { google } = require("@ai-sdk/google");

/**
 * Main class for nutritional estimation
 */
class NutritionEstimator {
  constructor() {
    // Initialize services
    const aiModel = google("gemini-2.0-flash-lite", {
      // Get model instance once
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      safetySettings: [
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
      ],
    });
    this.recipeFetcher = new RecipeFetcher(null, aiModel); // Pass model to fetcher
    this.ingredientMapper = new IngredientMapper(aiModel); // Pass model to mapper
    this.quantityStandardizer = new QuantityStandardizer();
    this.nutritionCalculator = new NutritionCalculator(
      this.ingredientMapper,
      this.quantityStandardizer
    );
    this.dishClassifier = new DishClassifier();
  }

  /**
   * Estimate nutrition for a given dish
   * @param {string} dishName - The name of the dish
   * @returns {Promise<Object>} - Nutrition information
   */
  async estimateNutrition(dishName) {
    try {
      // Basic validation
      if (!dishName || typeof dishName !== 'string' || dishName.trim().length < 3) {
        return {
          error: true,
          message: `Invalid dish name: "${dishName}". Name must be at least 3 characters long.`
        };
      }

      console.log(`Estimating nutrition for ${dishName}`);
      
      // First validate the dish name using LLM
      const validation = await this.recipeFetcher.validateDishNameWithLLM(dishName);
      if (!validation.isValid) {
        return {
          error: true,
          message: validation.message,
          suggestion: validation.suggestedName ? 
            `Did you mean: "${validation.suggestedName}"?` : 
            null
        };
      }
      
      // Get recipe for the dish using the validated name
      const dishNameToUse = validation.suggestedName || dishName;
      const recipe = await this.recipeFetcher.fetchRecipe(dishNameToUse);
      
      // If no recipe was found, return an error
      if (!recipe) {
        return {
          error: true,
          message: `Could not find a recipe for "${dishNameToUse}". This may not be a valid Indian dish.`
        };
      }
      
      // Verify that the recipe has the required fields
      if (!recipe.name || !recipe.ingredients || recipe.ingredients.length === 0) {
        return {
          error: true,
          message: `Invalid recipe data for "${dishNameToUse}". Missing required information.`
        };
      }
      
      // Classify the dish
      const dishType = this.dishClassifier.classifyDish(recipe.name);
      
      // Calculate nutrition
      const nutritionResult = await this.nutritionCalculator.calculateNutrition(recipe.ingredients);
      
      // Verify that nutrition calculation was successful
      if (!nutritionResult || !nutritionResult.totalNutrition) {
        return {
          error: true,
          message: `Could not calculate nutrition for "${recipe.name}". Missing nutrition data.`
        };
      }
      
      // Calculate per serving nutrition
      const perServingNutrition = this.nutritionCalculator.calculatePerServing(
        nutritionResult.totalNutrition,
        nutritionResult.totalWeightInGrams,
        dishType
      );
      
      // Get cooking instructions if available
      let cookingInstructions = null;
      if (this.recipeFetcher.useAiSdk) {
        cookingInstructions = await this.recipeFetcher.getCookingInstructions(recipe.name);
      }
      
      // Return the result
      return {
        error: false,
        dish_name: recipe.name,
        dish_type: dishType,
        serving_size: {
          household_measure: this.quantityStandardizer.getHouseholdMeasure(dishType),
          grams: perServingNutrition.serving_size_g
        },
        estimated_nutrition_per_serving: {
          calories: perServingNutrition.calories,
          protein: perServingNutrition.protein,
          carbs: perServingNutrition.carbs,
          fat: perServingNutrition.fat,
          fiber: perServingNutrition.fiber
        },
        ingredients_used: nutritionResult.processedIngredients,
        cooking_instructions: cookingInstructions
      };
    } catch (error) {
      console.error(`Error estimating nutrition for ${dishName}:`, error);
      return {
        error: true,
        message: `Error estimating nutrition: ${error.message}`
      };
    }
  }

  /**
   * Get the appropriate serving unit for a dish type
   * @param {string} dishType - The type of dish
   * @returns {string} - The serving unit
   */
  getServingUnit(dishType) {
    const servingUnits = {
      "Wet Sabzi": "katori",
      "Dry Sabzi": "katori",
      Dal: "katori",
      Rice: "katori",
      Roti: "piece",
      "Non-Veg Curry": "katori",
    };

    return servingUnits[dishType] || "serving";
  }
}

module.exports = NutritionEstimator;
