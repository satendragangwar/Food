/**
 * Utility class for handling errors and edge cases
 */
class ErrorHandler {
  /**
   * Check if the nutrition values are valid (not extreme)
   * @param {Object} nutrition - Nutrition object with calories, protein, etc.
   * @returns {Object} - Validated nutrition object
   */
  static validateNutritionValues(nutrition) {
    const validated = { ...nutrition };
    
    // Check for extremely high calorie values
    if (nutrition.calories > 1000) {
      console.warn(`Unusually high calorie value: ${nutrition.calories}, capping at 1000`);
      validated.calories = 1000;
    }
    
    // Check for negative values
    for (const [key, value] of Object.entries(validated)) {
      if (value < 0) {
        console.warn(`Negative ${key} value: ${value}, setting to 0`);
        validated[key] = 0;
      }
    }
    
    // Check for extreme macronutrient values
    if (nutrition.protein > 100) {
      console.warn(`Unusually high protein value: ${nutrition.protein}, capping at 100g`);
      validated.protein = 100;
    }
    
    if (nutrition.carbs > 200) {
      console.warn(`Unusually high carbs value: ${nutrition.carbs}, capping at 200g`);
      validated.carbs = 200;
    }
    
    if (nutrition.fat > 100) {
      console.warn(`Unusually high fat value: ${nutrition.fat}, capping at 100g`);
      validated.fat = 100;
    }
    
    return validated;
  }

  /**
   * Handle the case when no recipe is found
   * @param {string} dishName - The name of the dish
   * @returns {Object} - Default response
   */
  static handleNoRecipeFound(dishName) {
    console.error(`No recipe found for ${dishName}`);
    return {
      error: true,
      message: `Could not find a recipe for ${dishName}. Please try a different dish.`,
      estimated_nutrition_per_serving: null,
      dish_type: null,
      ingredients_used: []
    };
  }

  /**
   * Handle the case when no nutrition data is found
   * @param {string} dishName - The name of the dish
   * @param {Array} ingredients - The ingredients list
   * @returns {Object} - Default response with partial data
   */
  static handleNoNutritionData(dishName, dishType, ingredients) {
    console.error(`No nutrition data found for ${dishName}`);
    return {
      warning: true,
      message: `Could not calculate nutrition for ${dishName} due to missing data.`,
      estimated_nutrition_per_serving: {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0
      },
      dish_type: dishType || 'Unknown',
      ingredients_used: ingredients.map(i => ({
        ingredient: i.name,
        quantity: i.standardQuantity || i.quantity
      }))
    };
  }

  /**
   * Validate total weight of a dish
   * @param {number} totalWeight - The total weight in grams
   * @param {string} dishType - The type of dish
   * @returns {number} - Validated total weight
   */
  static validateTotalWeight(totalWeight, dishType) {
    if (!totalWeight || totalWeight <= 0) {
      console.warn(`Invalid total weight: ${totalWeight}, using default`);
      // Return default weight based on dish type
      const defaultWeights = {
        'Wet Sabzi': 800,
        'Dry Sabzi': 600,
        'Dal': 800,
        'Rice': 600,
        'Roti': 300,
        'Non-Veg Curry': 900,
        'Unknown': 700
      };
      
      return defaultWeights[dishType] || 700;
    }
    
    // Check if weight is unreasonably large
    if (totalWeight > 5000) {
      console.warn(`Extremely large total weight: ${totalWeight}, capping at 5000g`);
      return 5000;
    }
    
    return totalWeight;
  }
}

module.exports = ErrorHandler; 